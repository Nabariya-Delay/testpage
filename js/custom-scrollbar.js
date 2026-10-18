(() => {
    'use strict';

    // 色・サイズのカスタマイズはここで行います（単位はpx）。
    const SETTINGS = {
        width: 20,
        minThumbHeight: 52,
        trackColor: '#413f57',
        thumbColor: '#ffffff',
        thumbHoverColor: '#ffffff'
    };

    // deferの有無や、初期化前の重複読み込みにも対応します。
    const instanceKey = Symbol.for('custom-page-scrollbar');
    if (window[instanceKey]) return;
    window[instanceKey] = true;

    function init() {
        const root = document.documentElement;
        const style = document.createElement('style');
        style.id = 'custom-page-scrollbar-style';
        style.textContent = `
            html.custom-page-scrollbar-enabled {
                scrollbar-width: none !important;
                scrollbar-gutter: auto !important;
            }
            html.custom-page-scrollbar-enabled::-webkit-scrollbar,
            html.custom-page-scrollbar-enabled > body::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
            #custom-page-scrollbar {
                all: initial;
                position: fixed;
                top: 0;
                left: 0;
                right: auto;
                bottom: 0;
                width: ${SETTINGS.width}px;
                display: block;
                box-sizing: border-box;
                background: ${SETTINGS.trackColor};
                border: 0;
                border-radius: 0;
                box-shadow: none;
                z-index: 2147483647;
                contain: strict;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            #custom-page-scrollbar[hidden] { display: none !important; }
            #custom-page-scrollbar-thumb {
                all: initial;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                display: block;
                box-sizing: border-box;
                background: ${SETTINGS.thumbColor};
                border: 0;
                border-radius: 0;
                box-shadow: none;
                cursor: grab;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            #custom-page-scrollbar-thumb:hover,
            #custom-page-scrollbar-thumb:focus-visible,
            html.custom-page-scrollbar-dragging #custom-page-scrollbar-thumb {
                background: ${SETTINGS.thumbHoverColor};
            }
            #custom-page-scrollbar-thumb:focus-visible {
                outline: 1px solid white;
                outline-offset: -1px;
            }
            #custom-collection-scrollbar-group {
                display: block;
                width: 100%;
                min-width: 0;
                margin: 0 0 20px;
            }
            #custom-collection-scrollbar-group > .slider-container {
                margin-bottom: 0;
            }
            #custom-collection-scrollbar {
                all: initial;
                position: relative;
                display: block;
                width: 100%;
                height: ${SETTINGS.width}px;
                box-sizing: border-box;
                background: ${SETTINGS.trackColor};
                border: 0;
                border-radius: 0;
                box-shadow: none;
                contain: strict;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            #custom-collection-scrollbar[hidden] { display: none !important; }
            #custom-collection-scrollbar-thumb {
                all: initial;
                position: absolute;
                display: block;
                top: 0;
                left: 0;
                height: 100%;
                box-sizing: border-box;
                background: ${SETTINGS.thumbColor};
                border: 0;
                border-radius: 0;
                box-shadow: none;
                cursor: grab;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            #custom-collection-scrollbar-thumb:hover,
            #custom-collection-scrollbar-thumb:focus-visible,
            html.custom-page-scrollbar-dragging #custom-collection-scrollbar-thumb {
                background: ${SETTINGS.thumbHoverColor};
            }
            #custom-collection-scrollbar-thumb:focus-visible {
                outline: 1px solid white;
                outline-offset: -1px;
            }
            #collection .slider-container.custom-collection-scrollbar-dragging {
                scroll-snap-type: none !important;
            }
            #collection .slider-container::-webkit-scrollbar { display: none; }
            html.custom-page-scrollbar-dragging,
            html.custom-page-scrollbar-dragging * {
                user-select: none !important;
                -webkit-user-select: none !important;
                cursor: grabbing !important;
            }
        `;

        const track = document.createElement('div');
        track.id = 'custom-page-scrollbar';
        track.hidden = true;
        const thumb = document.createElement('div');
        thumb.id = 'custom-page-scrollbar-thumb';
        thumb.tabIndex = 0;
        thumb.setAttribute('role', 'scrollbar');
        thumb.setAttribute('aria-label', 'ページの縦スクロール');
        thumb.setAttribute('aria-orientation', 'vertical');
        thumb.setAttribute('aria-valuemin', '0');
        track.append(thumb);
        document.head.append(style);
        document.body.append(track);
        root.classList.add('custom-page-scrollbar-enabled');
        const collectionScrollbar = createCollectionScrollbar(root);

        let frame = 0;
        let needsMeasure = true;
        let viewportHeight = 0;
        let maxScroll = 0;
        let thumbHeight = 0;
        let travel = 0;
        let drag = null;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        function endDrag(event) {
            if (!drag || (event && event.pointerId !== drag.pointerId)) return;
            const pointerId = drag.pointerId;
            drag = null;
            root.classList.remove('custom-page-scrollbar-dragging');
            if (thumb.hasPointerCapture(pointerId)) thumb.releasePointerCapture(pointerId);
        }

        function measure() {
            viewportHeight = window.innerHeight;
            const pageHeight = Math.max(root.scrollHeight, document.body.scrollHeight, viewportHeight);
            maxScroll = Math.max(0, pageHeight - viewportHeight);
            track.hidden = maxScroll <= 0 || viewportHeight <= 0;
            if (track.hidden) {
                endDrag();
                return;
            }
            const trackHeight = track.getBoundingClientRect().height;
            // 極端に低いウィンドウでも、つまみがレールからはみ出さないようにします。
            thumbHeight = Math.min(trackHeight, Math.max(SETTINGS.minThumbHeight,
                trackHeight * viewportHeight / pageHeight));
            travel = Math.max(0, trackHeight - thumbHeight);
            thumb.style.height = `${thumbHeight}px`;
        }

        function render() {
            frame = 0;
            if (needsMeasure) {
                needsMeasure = false;
                measure();
            }
            if (track.hidden) return;
            const position = clamp(window.scrollY, 0, maxScroll);
            thumb.style.transform = `translateY(${maxScroll ? position / maxScroll * travel : 0}px)`;
            thumb.setAttribute('aria-valuemax', String(Math.round(maxScroll)));
            thumb.setAttribute('aria-valuenow', String(Math.round(position)));
        }

        function schedule(measureSize = false) {
            needsMeasure = needsMeasure || measureSize;
            if (!frame) frame = window.requestAnimationFrame(render);
        }

        function scrollToPosition(position) {
            // 既存のscroll-behavior: smoothがあっても、ドラッグには即座に追従します。
            window.scrollTo({ top: clamp(position, 0, maxScroll), left: window.scrollX, behavior: 'instant' });
            schedule();
        }

        thumb.addEventListener('pointerdown', (event) => {
            if (!event.isPrimary || event.button !== 0 || drag) return;
            measure();
            if (track.hidden || !travel) return;
            event.preventDefault();
            thumb.focus({ preventScroll: true });
            drag = {
                pointerId: event.pointerId,
                grabRatio: clamp((event.clientY - thumb.getBoundingClientRect().top) / thumbHeight, 0, 1)
            };
            thumb.setPointerCapture(event.pointerId);
            root.classList.add('custom-page-scrollbar-dragging');
        });

        thumb.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (needsMeasure) {
                needsMeasure = false;
                measure();
            }
            if (!drag || !travel) return;
            const top = event.clientY - track.getBoundingClientRect().top - drag.grabRatio * thumbHeight;
            scrollToPosition(top / travel * maxScroll);
        });
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);
        thumb.addEventListener('lostpointercapture', endDrag);
        window.addEventListener('blur', () => endDrag());

        track.addEventListener('pointerdown', (event) => {
            if (event.target !== track || !event.isPrimary || event.button !== 0 || drag) return;
            measure();
            if (track.hidden || !travel) return;
            event.preventDefault();
            thumb.focus({ preventScroll: true });
            const top = event.clientY - track.getBoundingClientRect().top - thumbHeight / 2;
            scrollToPosition(top / travel * maxScroll);
        });

        // 独自バーにフォーカスした場合もキーボードで操作できます。
        thumb.addEventListener('keydown', (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            measure();
            const destinations = {
                ArrowUp: window.scrollY - 40,
                ArrowDown: window.scrollY + 40,
                PageUp: window.scrollY - viewportHeight,
                PageDown: window.scrollY + viewportHeight,
                Home: 0,
                End: maxScroll,
                ' ': window.scrollY + (event.shiftKey ? -viewportHeight : viewportHeight)
            };
            if (!Object.prototype.hasOwnProperty.call(destinations, event.key)) return;
            event.preventDefault();
            scrollToPosition(destinations[event.key]);
        });

        // 通常のホイール・タッチ・キーボード操作はブラウザに任せます。
        window.addEventListener('scroll', () => schedule(), { passive: true });
        const invalidate = () => {
            schedule(true);
            if (collectionScrollbar) collectionScrollbar.invalidate();
        };
        window.addEventListener('resize', invalidate, { passive: true });
        window.addEventListener('pageshow', invalidate);
        document.addEventListener('load', invalidate, true);
        document.addEventListener('transitionend', invalidate, true);
        document.addEventListener('animationend', invalidate, true);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', invalidate, { passive: true });
        if (document.fonts) document.fonts.ready.then(invalidate);

        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(invalidate);
            resizeObserver.observe(root);
            resizeObserver.observe(document.body);
        }
        const mutationObserver = new MutationObserver((records) => {
            // 自分自身のstyle/ARIA更新は無視し、監視による更新ループを防ぎます。
            if (records.some(({ target }) => !track.contains(target) && !style.contains(target)
                && !(collectionScrollbar && collectionScrollbar.track.contains(target)))) invalidate();
        });
        mutationObserver.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
        schedule(true);
    }

    // 写真と横バーを同じグリッド項目にまとめ、写真の直下に配置します。
    function createCollectionScrollbar(root) {
        const section = document.querySelector('#collection');
        const slider = section && section.querySelector('.slider-container');
        if (!slider) return null;

        const track = document.createElement('div');
        track.id = 'custom-collection-scrollbar';
        track.hidden = true;
        const thumb = document.createElement('div');
        thumb.id = 'custom-collection-scrollbar-thumb';
        thumb.tabIndex = 0;
        thumb.setAttribute('role', 'scrollbar');
        thumb.setAttribute('aria-label', 'Collectionの横スクロール');
        thumb.setAttribute('aria-orientation', 'horizontal');
        thumb.setAttribute('aria-valuemin', '0');
        track.append(thumb);
        const group = document.createElement('div');
        group.id = 'custom-collection-scrollbar-group';
        slider.insertAdjacentElement('beforebegin', group);
        group.append(slider, track);

        let frame = 0;
        let needsMeasure = true;
        let maxScroll = 0;
        let thumbWidth = 0;
        let travel = 0;
        let drag = null;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        function endDrag(event) {
            if (!drag || (event && event.pointerId !== drag.pointerId)) return;
            const pointerId = drag.pointerId;
            drag = null;
            slider.classList.remove('custom-collection-scrollbar-dragging');
            root.classList.remove('custom-page-scrollbar-dragging');
            if (thumb.hasPointerCapture(pointerId)) thumb.releasePointerCapture(pointerId);
            schedule();
        }

        function measure() {
            const overflow = window.getComputedStyle(slider).overflowX;
            maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
            // スマートフォンの既存の縦並び表示では横バーを出しません。
            track.hidden = !['auto', 'scroll', 'overlay'].includes(overflow)
                || maxScroll <= 0 || slider.clientWidth <= 0;
            if (track.hidden) {
                endDrag();
                return;
            }
            const trackWidth = track.clientWidth;
            thumbWidth = Math.min(trackWidth, Math.max(SETTINGS.minThumbHeight,
                trackWidth * slider.clientWidth / slider.scrollWidth));
            travel = Math.max(0, trackWidth - thumbWidth);
            thumb.style.width = `${thumbWidth}px`;
        }

        function render() {
            frame = 0;
            if (needsMeasure) {
                needsMeasure = false;
                measure();
            }
            if (track.hidden) return;
            const position = clamp(slider.scrollLeft, 0, maxScroll);
            thumb.style.transform = `translateX(${maxScroll ? position / maxScroll * travel : 0}px)`;
            thumb.setAttribute('aria-valuemax', String(Math.round(maxScroll)));
            thumb.setAttribute('aria-valuenow', String(Math.round(position)));
        }

        function schedule(measureSize = false) {
            needsMeasure = needsMeasure || measureSize;
            if (!frame) frame = window.requestAnimationFrame(render);
        }

        function scrollToPosition(position) {
            slider.scrollTo({ left: clamp(position, 0, maxScroll), top: slider.scrollTop, behavior: 'instant' });
            schedule();
        }

        thumb.addEventListener('pointerdown', (event) => {
            if (!event.isPrimary || event.button !== 0 || drag) return;
            measure();
            if (track.hidden || !travel) return;
            event.preventDefault();
            thumb.focus({ preventScroll: true });
            const rect = thumb.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                grabRatio: clamp((event.clientX - rect.left) / rect.width, 0, 1)
            };
            thumb.setPointerCapture(event.pointerId);
            slider.classList.add('custom-collection-scrollbar-dragging');
            root.classList.add('custom-page-scrollbar-dragging');
        });
        thumb.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            if (needsMeasure) {
                needsMeasure = false;
                measure();
            }
            if (!drag || !travel) return;
            // ScrollRevealによる拡大・移動があっても、ローカル座標へ変換します。
            const rect = track.getBoundingClientRect();
            const scale = rect.width / track.clientWidth || 1;
            const left = (event.clientX - rect.left) / scale - drag.grabRatio * thumbWidth;
            scrollToPosition(left / travel * maxScroll);
        });
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);
        thumb.addEventListener('lostpointercapture', endDrag);
        window.addEventListener('blur', () => endDrag());
        track.addEventListener('pointerdown', (event) => {
            if (event.target !== track || !event.isPrimary || event.button !== 0 || drag) return;
            measure();
            if (track.hidden || !travel) return;
            event.preventDefault();
            thumb.focus({ preventScroll: true });
            const rect = track.getBoundingClientRect();
            const scale = rect.width / track.clientWidth || 1;
            const left = (event.clientX - rect.left) / scale - thumbWidth / 2;
            scrollToPosition(left / travel * maxScroll);
        });
        thumb.addEventListener('keydown', (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            measure();
            const destinations = {
                ArrowLeft: slider.scrollLeft - slider.clientWidth,
                ArrowRight: slider.scrollLeft + slider.clientWidth,
                PageUp: slider.scrollLeft - slider.clientWidth,
                PageDown: slider.scrollLeft + slider.clientWidth,
                Home: 0,
                End: maxScroll,
                ' ': slider.scrollLeft + (event.shiftKey ? -slider.clientWidth : slider.clientWidth)
            };
            if (!Object.prototype.hasOwnProperty.call(destinations, event.key)) return;
            event.preventDefault();
            scrollToPosition(destinations[event.key]);
        });
        slider.addEventListener('scroll', () => schedule(), { passive: true });
        const invalidate = () => schedule(true);
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(invalidate);
            resizeObserver.observe(slider);
            resizeObserver.observe(track.parentElement);
            // 画像読込やスライド寸法の変化も検知します。
            for (const slide of slider.children) resizeObserver.observe(slide);
        }
        schedule(true);
        return { track, invalidate };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
