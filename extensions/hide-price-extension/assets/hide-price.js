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
      var el = document.getElementById(CONFIG_ID);
      var parsed = el ? JSON.parse(el.textContent) : {};
      config = { ...DEFAULTS, ...parsed };
      if (config.hideOnlyOutOfStock !== false) {
        config.hideOnlyOutOfStock = true;
      }
    } catch (e) {
      config = { ...DEFAULTS };
    }
  }

  function discoverProductCards() {
    var links = document.querySelectorAll('a[href*="/products/"]');
    var seen = new Set();
    var cards = [];

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var card = link.closest(
        '.product-card, .product-item, [data-product-card], .product-card-wrapper, ' +
        '.card, .card-wrapper, .grid__item, .collection-product-card, ' +
        'li, article'
      );
      if (!card) card = link.parentElement;
      if (!card || seen.has(card)) continue;

      var productLinks = card.querySelectorAll('a[href*="/products/"]');
      var uniqueHandles = new Set();
      for (var j = 0; j < productLinks.length; j++) {
        var m = productLinks[j].href.match(/\/products\/([^/?#]+)/);
        if (m) uniqueHandles.add(m[1]);
      }
      if (uniqueHandles.size > 1) continue;

      seen.add(card);
      cards.push(card);
    }
    return cards;
  }

  function checkLiquidAvailability(handle) {
    if (!handle) return null;
    if (!config.productAvailability) return null;
    if (!(handle in config.productAvailability)) return null;
    return config.productAvailability[handle] === false;
  }

  function isCardSoldOut(card) {
    var badges = card.querySelectorAll('.badge, .card__badge, .product-tag, span, div');
    for (var i = 0; i < badges.length; i++) {
      var text = (badges[i].textContent || '').trim().toLowerCase();
      if (text === 'sold out' || text === 'out of stock' || text === 'unavailable') {
        return true;
      }
    }

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

    if (card.querySelector('[data-available="false"], [data-sold-out], [data-unavailable="true"]')) {
      return true;
    }

    return false;
  }

  var ajaxCache = {};
  function fetchProductAvailability(handle, callback) {
    if (ajaxCache[handle] !== undefined) {
      callback(ajaxCache[handle]);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/products/' + encodeURIComponent(handle) + '.js', true);
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

  function shouldHideForCard(handle, card) {
    if (!config.enabled) return false;
    if (config.hideOnlyOutOfStock === false) return true;

    var liquidResult = checkLiquidAvailability(handle);
    if (liquidResult !== null) return liquidResult;

    if (card) {
      var domResult = isCardSoldOut(card);
      if (domResult) return true;
    }

    return false;
  }

  function asyncCheckCard(handle, card) {
    fetchProductAvailability(handle, function(outOfStock) {
      if (outOfStock) {
        card.querySelectorAll(SELECTORS.price).forEach(hidePrice);
        card.querySelectorAll(SELECTORS.addToCart).forEach(hideBtn);
      }
    });
  }

  function hidePrice(el) {
    if (el.dataset.priceHidden) return;
    el.dataset.priceHidden = '1';
    var msg = document.createElement('span');
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

    var productArea = document.querySelector(SELECTORS.productPage) || document.body;
    var hide = shouldHideForCard(handle, productArea);

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

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.dataset.hidePriceProcessed) continue;
      card.dataset.hidePriceProcessed = '1';

      var handle = getProductHandle(card);
      if (!handle) continue;

      var hide = shouldHideForCard(handle, card);

      if (hide) {
        card.querySelectorAll(SELECTORS.price).forEach(hidePrice);
        card.querySelectorAll(SELECTORS.addToCart).forEach(hideBtn);
      } else if (config.hideOnlyOutOfStock !== false) {
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
