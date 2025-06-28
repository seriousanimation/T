function startGenerativeBG() {
    // Implementation from your generativebackground.js file
}
window.onload = () => {
    if (typeof startGenerativeBG === 'function') {
        startGenerativeBG();
    }
};

document.addEventListener('DOMContentLoaded', () => {

    const viewport = document.getElementById('viewport');
    const world = document.getElementById('world');
    const topicRows = document.querySelectorAll('.topic-row');
    const wires = document.querySelectorAll('.connector-wire');

    let scale = 1;
    let panY = 0;
    let isZoomed = false;
    let activeRow = null;
    let currentTopicIndex = 0;
    let isNavigating = false;

    function applyTransform() {
        world.style.transform = `translateY(${panY}px) scale(${scale})`;
    }

    function updateWires(row, show = false) {
        const mainPanel = row.querySelector('.main-panel');
        const leftVideoPanel = row.querySelector('.video-panel');
        const rightVideoPanel = row.querySelector('.video-panel-2');
        const wireLeft = wires[(Array.from(topicRows).indexOf(row) * 2)];
        const wireRight = wires[(Array.from(topicRows).indexOf(row) * 2) + 1];

        if (!show) {
            wireLeft.classList.remove('visible');
            wireRight.classList.remove('visible');
            return;
        }

        const mainRect = mainPanel.getBoundingClientRect();
        const leftRect = leftVideoPanel.getBoundingClientRect();
        const rightRect = rightVideoPanel.getBoundingClientRect();
        const worldRect = world.getBoundingClientRect();

        const startX = mainRect.left + mainRect.width / 2 - worldRect.left;
        const startY = mainRect.top + mainRect.height / 2 - worldRect.top;
        const end1X = leftRect.left + leftRect.width / 2 - worldRect.left;
        const end1Y = leftRect.top + leftRect.height / 2 - worldRect.top;
        const end2X = rightRect.left + rightRect.width / 2 - worldRect.left;
        const end2Y = rightRect.top + rightRect.height / 2 - worldRect.top;

        const controlOffset = 150;
        const path1_d = `M ${startX},${startY} C ${startX - controlOffset},${startY} ${end1X + controlOffset},${end1Y} ${end1X},${end1Y}`;
        const path2_d = `M ${startX},${startY} C ${startX + controlOffset},${startY} ${end2X - controlOffset},${end2Y} ${end2X},${end2Y}`;

        wireLeft.setAttribute('d', path1_d);
        wireRight.setAttribute('d', path2_d);
        wireLeft.classList.add('visible');
        wireRight.classList.add('visible');
    }

    // --- CHANGE: Reworked focus and zoom logic for stability ---

    // This function now ONLY handles the zooming.
    function applyZoomToFit(row) {
        const viewportWidth = viewport.clientWidth;
        const rowWidth = row.scrollWidth;
        scale = (viewportWidth / rowWidth) * 0.9;
        applyTransform();
    }

    // This function now ONLY handles the panning.
    function panToRow(row) {
        const rowRect = row.getBoundingClientRect();
        // We calculate the pan relative to the viewport, not the world, for consistency.
        panY = (viewport.clientHeight / 2) - rowRect.height / 2 - rowRect.top;
        applyTransform();
    }


    function resetFocus() {
        isZoomed = false;
        if (activeRow) {
            activeRow.classList.remove('panels-visible');
            updateWires(activeRow, false);
            activeRow = null;
        }
        scale = 1;
        // panY will be reset by the navigation function
    }
    
    function navigateToTopic(index) {
        if (index < 0 || index >= topicRows.length) return;
        
        const wasZoomed = isZoomed;
        if (wasZoomed) {
            resetFocus();
        }

        currentTopicIndex = index;
        const targetRow = topicRows[index];
        const targetY = (viewport.clientHeight / 2) - (targetRow.offsetTop + targetRow.offsetHeight / 2);

        if (wasZoomed) {
            applyTransform(); // Apply zoom-out first
            setTimeout(() => {
                panY = targetY;
                applyTransform(); // Then pan
            }, 500);
        } else {
            panY = targetY;
            applyTransform();
        }
    }
    
    // --- SETUP INITIAL STATE AND EVENT LISTENERS ---
    
    function setInitialPosition() {
        currentTopicIndex = 0;
        const initialRow = topicRows[0];
        world.classList.add('no-transition');
        panY = (viewport.clientHeight / 2) - (initialRow.offsetTop + initialRow.offsetHeight / 2);
        applyTransform();
        world.offsetHeight;
        world.classList.remove('no-transition');
    }
    
    // Using a short timeout to ensure all elements are rendered before calculating position
    setTimeout(setInitialPosition, 50);

    topicRows.forEach((row, index) => {
        const mainPanel = row.querySelector('.main-panel');
        const videos = row.querySelectorAll('.topic-video');
        const leftPanelContainer = row.querySelector('.left-panels');

        mainPanel.addEventListener('click', () => {
            const isBecomingVisible = !row.classList.contains('panels-visible');
            
            if (activeRow && activeRow !== row) {
                activeRow.classList.remove('panels-visible');
                updateWires(activeRow, false);
            }

            if (isBecomingVisible) {
                // --- Step 1: Pan to the row
                panToRow(row);
                // --- Step 2: Play videos and expand panels
                videos.forEach(video => video.play());
                row.classList.add('panels-visible');
                isZoomed = true;
                activeRow = row;
                currentTopicIndex = index;
            } else {
                // --- If closing, just reset everything
                videos.forEach(video => video.pause());
                resetFocus();
                navigateToTopic(index);
            }
        });

        leftPanelContainer.addEventListener('transitionend', (event) => {
            if (row.classList.contains('panels-visible') && event.propertyName === 'max-width') {
                // --- Step 3: Once panels are out, apply the final zoom
                applyZoomToFit(row);
                updateWires(row, true);
            }
        });
    });

    function handleNavigation(direction) {
        if (isNavigating) return;
        isNavigating = true;
        const nextIndex = currentTopicIndex + direction;
        navigateToTopic(nextIndex);
        setTimeout(() => { isNavigating = false; }, 800);
    }

    viewport.addEventListener('wheel', (event) => {
        event.preventDefault();
        // Do not allow wheel navigation if a panel is open
        if (isZoomed) return;
        handleNavigation(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
        // Do not allow key navigation if a panel is open
        if (isZoomed) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            handleNavigation(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            handleNavigation(-1);
        }
    });

    window.addEventListener('resize', () => {
        if (isZoomed && activeRow) {
            panToRow(activeRow);
            applyZoomToFit(activeRow);
        } else {
            navigateToTopic(currentTopicIndex);
        }
    });
});
