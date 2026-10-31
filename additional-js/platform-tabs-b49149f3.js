// Platform tabs for the tutorial chapters.
//
// Authoring shape (kept plain on purpose, no mdbook plugin):
//
//   <div class="platform-tabs">
//   <div class="platform-tab-titles" role="tablist">
//   <button type="button" data-platform-tab="android">Android</button>
//   ...
//   </div>
//
//   <div class="platform-tab-panel" data-platform-panel="android">
//
//   ### Markdown content (rendered by mdbook, so keep a blank line above)
//
//   </div>
//
//   </div>
//
// Behaviour:
// * The chosen platform is one page-wide choice: every tab set on a chapter
//   follows it, the choice persists across chapters (localStorage) and it is
//   written into the address bar (`first-map.html#android`) so a reader can
//   share a platform-specific link. Loading a URL whose hash names a platform
//   selects it; a hash naming a heading inside a panel selects that panel.
// * The on-page contents list mdbook builds from the chapter's headings is
//   relabelled per platform ("Android · Draw a map surface"), because every
//   panel contributes its headings and the unprefixed list repeats itself
//   four times. mdbook rebuilds that list on load and on scroll, so the
//   labels are re-applied whenever it changes.
//
// Degradation: without JavaScript there is no styling class, so the CSS
// hides the titles and shows every panel in full (the printable shape too).
// Themes stay explicit-owned in this project, so the component reads only
// the theme's own CSS variables and never queries color-scheme media.

(function () {
    'use strict';

    var TITLES_CLASS = 'platform-tab-titles';
    var TITLE_ATTR = 'data-platform-tab';
    var PANEL_ATTR = 'data-platform-panel';
    var INTERACTIVE_CLASS = 'platform-tabs--interactive';
    var ACTIVE_PANEL_CLASS = 'platform-tab-panel--active';
    var ACTIVE_TITLE_CLASS = 'platform-tab-title--active';
    var CONTENTS_LIST_CLASS = 'on-this-page';
    var CONTENTS_LABEL_SEPARATOR = ' · ';
    var PLATFORM_STORAGE_KEY = 'rustic-maps-docs-platform';
    // Prefix of the generated tab-button ids (the panels keep the platform name).
    var TITLE_ATTRIBUTE_ID_PREFIX = 'platform-tab-';

    // The platform names the site documents, in display order (WebAssembly
    // is documented last on every page), with the label each one shows.
    var PLATFORM_LABELS = {
        'android': 'Android',
        'ios': 'iOS',
        'react-native': 'React Native',
        'wasm': 'WebAssembly'
    };
    var PLATFORM_NAMES = Object.keys(PLATFORM_LABELS);

    function is_platform_name(value) {
        return Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value);
    }

    function stored_platform_name() {
        try {
            var stored_name = window.localStorage.getItem(PLATFORM_STORAGE_KEY);
            return is_platform_name(stored_name) ? stored_name : null;
        } catch (storage_unavailable) {
            return null;
        }
    }

    function store_platform_name(platform_name) {
        try {
            window.localStorage.setItem(PLATFORM_STORAGE_KEY, platform_name);
        } catch (storage_unavailable) {
            // A reader with storage disabled keeps the choice for this page.
        }
    }

    function hash_platform_name() {
        var hash_name = window.location.hash.replace(/^#/, '');
        if (is_platform_name(hash_name)) {
            return hash_name;
        }
        // A deep link into a panel's heading selects that panel's platform.
        if (hash_name === '') {
            return null;
        }
        var hash_target = document.getElementById(hash_name);
        var hash_panel = hash_target === null
            ? null
            : hash_target.closest('[' + PANEL_ATTR + ']');
        return hash_panel === null ? null : hash_panel.getAttribute(PANEL_ATTR);
    }

    function platforms_in(container) {
        return Array.prototype.map.call(
            container.querySelectorAll('[' + PANEL_ATTR + ']'),
            function (panel) {
                return panel.getAttribute(PANEL_ATTR);
            }
        );
    }

    // Gives every panel the stable id the shareable hash addresses
    // (`first-map.html#android`), leaving mdbook's heading ids untouched, and
    // pairs each tab button with its panel for assistive technology.
    function name_panel_ids(container) {
        var panels = container.querySelectorAll('[' + PANEL_ATTR + ']');
        var titles = container.querySelectorAll('[' + TITLE_ATTR + ']');
        var index;
        for (index = 0; index < panels.length; index += 1) {
            var panel_name = panels[index].getAttribute(PANEL_ATTR);
            if (document.getElementById(panel_name) === null) {
                panels[index].id = panel_name;
            }
            panels[index].setAttribute('aria-labelledby', TITLE_ATTRIBUTE_ID_PREFIX + panel_name);
        }
        for (index = 0; index < titles.length; index += 1) {
            var title_name = titles[index].getAttribute(TITLE_ATTR);
            titles[index].id = TITLE_ATTRIBUTE_ID_PREFIX + title_name;
            titles[index].setAttribute('aria-controls', title_name);
        }
    }

    function selectTab(container, targetName) {
        var titles = container.querySelectorAll('[' + TITLE_ATTR + ']');
        var panels = container.querySelectorAll('[' + PANEL_ATTR + ']');
        var index;
        for (index = 0; index < titles.length; index += 1) {
            var title = titles[index];
            var isActive = title.getAttribute(TITLE_ATTR) === targetName;
            title.classList.toggle(ACTIVE_TITLE_CLASS, isActive);
            title.setAttribute('aria-selected', isActive ? 'true' : 'false');
            title.tabIndex = isActive ? 0 : -1;
        }
        for (index = 0; index < panels.length; index += 1) {
            var panel = panels[index];
            var isPanelActive = panel.getAttribute(PANEL_ATTR) === targetName;
            panel.classList.toggle(ACTIVE_PANEL_CLASS, isPanelActive);
            panel.hidden = !isPanelActive;
        }
    }

    // Selects one platform in every tab set on the chapter and records the
    // choice (URL hash plus the remembered preference).
    function selectPlatform(platform_name, options) {
        var containers = document.querySelectorAll('.platform-tabs');
        var index;
        for (index = 0; index < containers.length; index += 1) {
            if (platforms_in(containers[index]).indexOf(platform_name) !== -1) {
                selectTab(containers[index], platform_name);
            }
        }
        if (options.persist) {
            store_platform_name(platform_name);
        }
        if (options.rewriteHash && window.history.replaceState) {
            // The hash follows the query string, never the other way round:
            // `#android?x=1` would make the whole tail part of the fragment.
            window.history.replaceState(
                null,
                '',
                window.location.pathname + window.location.search + '#' + platform_name
            );
        }
        labelContentsList();
    }

    function setupContainer(container) {
        var titles = container.querySelectorAll('[' + TITLE_ATTR + ']');
        var panels = container.querySelectorAll('[' + PANEL_ATTR + ']');
        if (titles.length === 0 || panels.length === 0) {
            return;
        }
        container.classList.add(INTERACTIVE_CLASS);
        name_panel_ids(container);

        var index;
        for (index = 0; index < titles.length; index += 1) {
            var title = titles[index];
            title.setAttribute('role', 'tab');
            (function (tabName) {
                title.addEventListener('click', function () {
                    selectPlatform(tabName, { persist: true, rewriteHash: true });
                });
                title.addEventListener('keydown', function (event) {
                    var step = event.key === 'ArrowRight'
                        ? 1
                        : (event.key === 'ArrowLeft' ? -1 : 0);
                    if (step === 0) {
                        return;
                    }
                    event.preventDefault();
                    var step_index = (index + step + titles.length) % titles.length;
                    var next_title = titles[step_index];
                    var next_name = next_title.getAttribute(TITLE_ATTR);
                    selectPlatform(next_name, { persist: true, rewriteHash: true });
                    next_title.focus();
                });
            }(title.getAttribute(TITLE_ATTR)));
        }
        for (index = 0; index < panels.length; index += 1) {
            panels[index].setAttribute('role', 'tabpanel');
        }
    }

    // Prefixes every on-page contents entry that points into a platform panel
    // with that platform's label, so the list does not repeat one heading name
    // four times with no way to tell the entries apart.
    function labelContentsList() {
        var contents_list = document.querySelector('.' + CONTENTS_LIST_CLASS);
        if (contents_list === null) {
            return;
        }
        var entries = contents_list.querySelectorAll('a[href^="#"]');
        var index;
        for (index = 0; index < entries.length; index += 1) {
            var entry = entries[index];
            var target_id = entry.getAttribute('href').replace(/^#/, '');
            var target = document.getElementById(target_id);
            if (target === null) {
                continue;
            }
            var panel = target.closest('[' + PANEL_ATTR + ']');
            if (panel === null) {
                continue;
            }
            var panel_name = panel.getAttribute(PANEL_ATTR);
            var label = PLATFORM_LABELS[panel_name];
            if (label === undefined) {
                continue;
            }
            if (entry.dataset.platformLabel !== label) {
                entry.dataset.platformLabel = label;
                entry.dataset.originalLabel = entry.textContent;
                entry.textContent = label + CONTENTS_LABEL_SEPARATOR + entry.textContent;
            }
        }
    }

    // mdbook rebuilds the contents list on load and on every scroll, so the
    // labels are re-applied whenever its subtree changes.
    function watchContentsList() {
        var sidebar = document.getElementById('mdbook-sidebar')
            || document.querySelector('.sidebar');
        if (sidebar === null || typeof window.MutationObserver !== 'function') {
            return;
        }
        var pending = false;
        var observer = new window.MutationObserver(function () {
            if (pending) {
                return;
            }
            pending = true;
            window.requestAnimationFrame(function () {
                pending = false;
                labelContentsList();
            });
        });
        observer.observe(sidebar, { childList: true, subtree: true });
    }

    function setupAll() {
        var containers = document.querySelectorAll('.platform-tabs');
        var index;
        for (index = 0; index < containers.length; index += 1) {
            setupContainer(containers[index]);
        }
        var initial_platform = hash_platform_name()
            || stored_platform_name()
            || (containers.length === 0
                ? null
                : containers[0].querySelector('[' + TITLE_ATTR + ']').getAttribute(TITLE_ATTR));
        if (initial_platform !== null) {
            // The page selects a tab on load, but it does not mint an anchor
            // for it: a reader who arrives at the plain address keeps the
            // plain address, and only a click or a followed deep link puts a
            // platform in the fragment. (Writing one here made every first
            // visit land on `#android`.)
            selectPlatform(initial_platform, {
                persist: true,
                rewriteHash: false,
            });
        }
        watchContentsList();
    }

    function onHashChange() {
        var platform_name = hash_platform_name();
        if (platform_name !== null) {
            selectPlatform(platform_name, { persist: true, rewriteHash: false });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAll);
    } else {
        setupAll();
    }
    window.addEventListener('hashchange', onHashChange);
}());
