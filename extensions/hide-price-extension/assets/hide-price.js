(function() {
  'use strict';
  const CONFIG_ID = 'hide-price-app-config';
  const APP_PREFIX = 'hide-price-app';
  let config = null;
  let initialized = false;

  const DEFAULTS = {
    enabled: true,
    hideAddToCart: true,
    hideOnlyOutOfStock: true,
    customMessage: 'Price on Request',
  };

  const SELECTORS = {
    price: '.price, .product-price, .product__price, .money, .price-item, .price__container, .price__regular, .price__sale, .card__price, [data-price], [data-product-price]',
    addToCart: '[name="add"], button[type="submit"], [data-add-to-cart]',
    productPage: '.product, .product-single, .product__info-wrapper, .product-form',
    productPagePrice: '.product__price, .price--large, .product-single__price, .product-form__price',
  };

  function loadConfig() {
    try {
      const el = document.getElementById(CONFIG_ID);
      const parsed = el ? JSON.parse(el.textContent) : {};
      config = { ...DEFAULTS, ...parsed };
      if (config.hideOnlyOutOfStock !== false) {
        config.hideOnlyOutOfStock = true;
      }
      console.log('[HidePriceApp] Config loaded:', JSON.stringify(config));
      if (config.productAvailability) {
        var handles = Object.keys(config.productAvailability);
        console.log('[HidePriceApp] Liquid availability for ' + handles.length + ' products:', JSON.stringify(config.productAvailability));
      } else {
        console.warn('[HidePriceApp] No productAvailability map found in config');
      }
    } catch (e) {
      config = { ...DEFAULTS };
      console.warn('[HidePriceApp] Config parse error, using defaults:', e.message);
    }
  }

  // Theme-agnostic card discovery: find cards by product links
  function discoverProductCards() {
    const links = document.querySelectorAll('a[href*="/products/"]');
    const seen = new Set();
    const cards = [];

    for (const link of links) {
      let card = link.closest(
        '.product-card, .product-item, [data-product-card], .product-card-wrapper, ' +
        '.card, .card-wrapper, .grid__item, .collection-product-card, ' +
        'li, article'
      );
      if (!card) card = link.parentElement;
      if (!card || seen.has(card)) continue;

      // Skip containers holding multiple different products
      const productLinks = card.querySelectorAll('a[href*="/products/"]');
      const uniqueHandles = new Set();
      for (const pl of productLinks) {
        const m = pl.href.match(/\/products\/([^/?#]+)/);
        if (m) uniqueHandles.add(m[1]);
      }
      if (uniqueHandles.size > 1) continue;

      seen.add(card);
      cards.push(card);
    }
    return cards;
  }

  // Check Liquid-embedded availability data for a handle.
  // Returns: true (out of stock), false (in stock), or null (not in map).
  function checkLiquidAvailability(handle) {
    if (!handle) return null;
    if (!config.productAvailability) return null;
    if (!(handle in config.productAvailability)) return null;
    // Liquid's product.available is true if ANY variant can be purchased
    // So available === false means ALL variants are out of stock
    return config.productAvailability[handle] === false;
  }

  // DOM-based sold-out detection: scan a container element for sold-out indicators
  function isCardSoldOut(card) {
    // 1. Check for sold-out text in badges/labels
    var badges = card.querySelectorAll('.badge, .card__badge, .product-tag, span, div');
    for (var i = 0; i < badges.length; i++) {
      var text = (badges[i].textContent || '').trim().toLowerCase();
      if (text === 'sold out' || text === 'out of stock' || text === 'unavailable') {
        return true;
      }
    }

    // 2. Check add-to-cart button state and text
    var btns = card.querySelectorAll('button, [role="button"], .btn, a.button');
    for (var j = 0; j < btns.length; j++) {
      var btn = btns[j];
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
        var btnText = (btn.textContent || '').trim().toLowerCase();
        if (btnText.includes('sold out') || btnText.includes('unavailable') || btnText.includes('out of stock')) {
          return true;
        }
      }
    }

    // 3. Check data attributes
    if (card.querySelector('[data-available="false"], [data-sold-out], [data-unavailable="true"]')) {
      return true;
    }

    return false;
  }

  // Fetch product availability via Shopify AJAX API
  var ajaxCache = {};
  function fetchProductAvailability(handle, callback) {
    if (ajaxCache[handle] !== undefined) {
      callback(ajaxCache[handle]);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/products/' + handle + '.js', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          var outOfStock = data.available === false;
          ajaxCache[handle] = outOfStock;
          callback(outOfStock);
        } catch (e) {
          ajaxCache[handle] = false;
          callback(false);
        }
      } else {
        ajaxCache[handle] = false;
        callback(false);
      }
    };
    xhr.onerror = function() {
      ajaxCache[handle] = false;
      callback(false);
    };
    xhr.send();
  }

  // Three-tier detection: Liquid map → DOM detection → AJAX API → safe default (don't hide)
  function shouldHideForCard(handle, card) {
    if (!config.enabled) return false;
    // When hideOnlyOutOfStock is off, hide ALL prices unconditionally
    if (config.hideOnlyOutOfStock === false) return true;

    // Tier 1: Liquid map
    var liquidResult = checkLiquidAvailability(handle);
    if (liquidResult !== null) {
      console.log('[HidePriceApp] "' + handle + '" Liquid map says out-of-stock=' + liquidResult);
      return liquidResult;
    }

    // Tier 2: DOM-based detection
    if (card) {
      var domResult = isCardSoldOut(card);
      if (domResult) {
        console.log('[HidePriceApp] "' + handle + '" DOM detection says sold out');
        return true;
      }
    }

    // Tier 3: Safe default — don't hide (AJAX will check async)
    console.log('[HidePriceApp] "' + handle + '" no sync signal, checking AJAX...');
    return false;
  }

  // Async check via AJAX API for cards not resolved by Liquid or DOM
  function asyncCheckCard(handle, card) {
    fetchProductAvailability(handle, function(outOfStock) {
      if (outOfStock) {
        console.log('[HidePriceApp] "' + handle + '" AJAX confirms out-of-stock, hiding price');
        card.querySelectorAll(SELECTORS.price).forEach(hidePrice);
        card.querySelectorAll(SELECTORS.addToCart).forEach(hideBtn);
      }
    });
  }

  function hidePrice(el) {
    if (el.dataset.priceHidden) return;
    el.dataset.priceHidden = '1';
    const msg = document.createElement('span');
    msg.className = APP_PREFIX + '-message';
    msg.textContent = config.customMessage;
    el.innerHTML = '';
    el.appendChild(msg);
  }

  function hideBtn(el) {
    if (!config.hideAddToCart) return;
    el.classList.add('hide-price-hidden');
    el.dataset.hidden = '1';
  }

  function getProductHandle(card) {
    var link = card.querySelector('a[href*="/products/"]');
    if (link) {
      var match = link.href.match(/\/products\/([^/?#]+)/);
      if (match) return match[1];
    }
    return null;
  }

  function getHandleFromURL() {
    var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function processProductPage() {
    if (!config.hideOnProductPage) return;

    var handle = getHandleFromURL();
    if (!handle) return;

    // Use the product info area as the DOM context for sold-out detection
    var productArea = document.querySelector(SELECTORS.productPage) || document.body;
    var hide = shouldHideForCard(handle, productArea);
    console.log('[HidePriceApp] Product page "' + handle + '": hide=' + hide);

    if (hide) {
      document.querySelectorAll(SELECTORS.productPagePrice).forEach(hidePrice);
      document.querySelectorAll(SELECTORS.price).forEach(function(el) {
        if (el.closest(SELECTORS.productPage)) hidePrice(el);
      });
      document.querySelectorAll(SELECTORS.addToCart).forEach(function(el) {
        if (el.closest(SELECTORS.productPage)) hideBtn(el);
      });
    }
  }

  function processCards() {
    var isCollection = window.location.pathname.includes('/collections/');
    var isSearch = window.location.pathname.includes('/search');
    var cards = discoverProductCards();
    var isFeatured = !isCollection && !isSearch && cards.length > 0;

    if (isCollection && !config.hideOnCollection) return;
    if (isFeatured && !config.hideOnFeatured) return;
    if (cards.length === 0) return;

    console.log('[HidePriceApp] Found ' + cards.length + ' product cards');

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.dataset.hidePriceProcessed) continue;
      card.dataset.hidePriceProcessed = '1';

      var handle = getProductHandle(card);
      if (!handle) continue;

      var hide = shouldHideForCard(handle, card);
      console.log('[HidePriceApp] Card "' + handle + '": hide=' + hide);

      if (hide) {
        card.querySelectorAll(SELECTORS.price).forEach(hidePrice);
        card.querySelectorAll(SELECTORS.addToCart).forEach(hideBtn);
      } else if (config.hideOnlyOutOfStock !== false) {
        // No sync result — check via AJAX API as fallback
        var liquidResult = checkLiquidAvailability(handle);
        if (liquidResult === null) {
          asyncCheckCard(handle, card);
        }
      }
    }
  }

  function init() {
    if (initialized) return;
    loadConfig();
    if (!config.enabled) return;

    var isProductPage = /\/products\/[^/?#]+/.test(window.location.pathname);

    if (isProductPage) {
      processProductPage();
    }
    processCards();

    new MutationObserver(function() {
      clearTimeout(init.timer);
      init.timer = setTimeout(function() {
        processCards();
        if (isProductPage) processProductPage();
      }, 100);
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('shopify:section:load', function() {
      setTimeout(function() {
        processCards();
        if (isProductPage) processProductPage();
      }, 100);
    });
    initialized = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
