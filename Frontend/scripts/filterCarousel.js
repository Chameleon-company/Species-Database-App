// Filter Carousel Functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterCarousel = document.getElementById('filter-carousel');
    
    // Check if carousel exists
    if (!filterCarousel) {
        console.error('Filter carousel not found!');
        return;
    }
    
    const filterButtons = filterCarousel.querySelectorAll('.filter-button');
    let activeButton = null;

    // Initialize: Set first button as active by default
    if (filterButtons.length > 0) {
        filterButtons[0].classList.add('active');
        activeButton = filterButtons[0];
    }

    // Drag-to-scroll functionality
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    // Mouse events (Desktop) - Click and drag scrolling
    filterCarousel.addEventListener('mousedown', function(e) {
        isDragging = true;
        hasDragged = false;
        startX = e.pageX - filterCarousel.offsetLeft;
        scrollLeft = filterCarousel.scrollLeft;
        filterCarousel.style.cursor = 'grabbing';
        filterCarousel.style.userSelect = 'none';
        e.preventDefault(); // Prevent text selection and default behavior
    });

    // Use document-level mouseup to ensure drag ends even if mouse leaves carousel
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            filterCarousel.style.cursor = 'grab';
            filterCarousel.style.userSelect = 'auto';
        }
    });

    filterCarousel.addEventListener('mouseleave', function() {
        // Keep dragging if mouse leaves but button is still down
        // Only stop if mouseup happened (handled by document listener)
    });

    // Use document-level mousemove to track mouse even outside carousel
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        hasDragged = true;
        const x = e.pageX - filterCarousel.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        filterCarousel.scrollLeft = scrollLeft - walk;
    });

    // Touch events (Mobile) - Touch and drag scrolling
    filterCarousel.addEventListener('touchstart', function(e) {
        isDragging = true;
        hasDragged = false;
        startX = e.touches[0].pageX - filterCarousel.offsetLeft;
        scrollLeft = filterCarousel.scrollLeft;
    }, { passive: true });

    filterCarousel.addEventListener('touchend', function() {
        isDragging = false;
    });

    filterCarousel.addEventListener('touchcancel', function() {
        isDragging = false;
    });

    filterCarousel.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        hasDragged = true;
        const x = e.touches[0].pageX - filterCarousel.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        filterCarousel.scrollLeft = scrollLeft - walk;
    }, { passive: true });

    // Handle button clicks (only if not dragging)
    // Note: Active state management is now handled in home.html
    // This code only prevents clicks during drag operations
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // If user was dragging, prevent the click
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                hasDragged = false;
                return;
            }

            // Active state management is handled in home.html
            // to support multiple active filters (leaf-type + fruit-type)
        });

        // Reset drag flag on button mouseup/touchend
        button.addEventListener('mouseup', function() {
            setTimeout(() => { hasDragged = false; }, 50);
        });
        button.addEventListener('touchend', function() {
            setTimeout(() => { hasDragged = false; }, 50);
        });
    });

    // Set initial cursor style
    filterCarousel.style.cursor = 'grab';
});
