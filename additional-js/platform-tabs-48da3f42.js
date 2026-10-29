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
// Degradation: without JavaScript there is no styling class, so the CSS
// hides the titles and shows every panel in full (the printable shape
// too). With JavaScript each container becomes an interactive tab set.
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

    function setupContainer(container) {
        var titles = container.querySelectorAll('[' + TITLE_ATTR + ']');
        var panels = container.querySelectorAll('[' + PANEL_ATTR + ']');
        if (titles.length === 0 || panels.length === 0) {
            return;
        }
        container.classList.add(INTERACTIVE_CLASS);

        var index;
        for (index = 0; index < titles.length; index += 1) {
            var title = titles[index];
            title.setAttribute('role', 'tab');
            (function (tabName) {
                title.addEventListener('click', function () {
                    selectTab(container, tabName);
                });
                title.addEventListener('keydown', function (event) {
                    var step = event.key === 'ArrowRight'
                        ? 1
                        : (event.key === 'ArrowLeft' ? -1 : 0);
                    if (step === 0) {
                        return;
                    }
                    event.preventDefault();
                    var nextIndex = (index + step + titles.length) % titles.length;
                    var nextTitle = titles[nextIndex];
                    selectTab(container, nextTitle.getAttribute(TITLE_ATTR));
                    nextTitle.focus();
                });
            }(title.getAttribute(TITLE_ATTR)));
        }
        for (index = 0; index < panels.length; index += 1) {
            panels[index].setAttribute('role', 'tabpanel');
        }

        // The panel whose data attribute names the first title opens.
        selectTab(container, titles[0].getAttribute(TITLE_ATTR));
    }

    function setupAll() {
        var containers = document.querySelectorAll('.platform-tabs');
        var index;
        for (index = 0; index < containers.length; index += 1) {
            setupContainer(containers[index]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAll);
    } else {
        setupAll();
    }
}());
