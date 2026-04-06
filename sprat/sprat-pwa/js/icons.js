// Inline SVG Icons for Concrete Calculator
// This replaces PNG icon references with inline SVGs

class IconManager {
    constructor() {
        this.icons = {
            // SVG icons
            'icon-dimensions': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="8" cy="7" r="2" fill="currentColor"/>
                    <circle cx="16" cy="12" r="2" fill="currentColor"/>
                    <circle cx="12" cy="17" r="2" fill="currentColor"/>
                </svg>
            `,
            
            'icon-worker': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="6" r="4" stroke="currentColor" stroke-width="2"/>
                    <path d="M5 20c2-4 7-6 12-6s10 2 12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-chart': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="4" height="18" rx="1" fill="currentColor"/>
                    <rect x="9" y="8" width="4" height="13" rx="1" fill="currentColor"/>
                    <rect x="15" y="4" width="4" height="17" rx="1" fill="currentColor"/>
                </svg>
            `,
            
            'icon-transport': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="6" cy="18" r="2" fill="currentColor"/>
                    <circle cx="16" cy="18" r="2" fill="currentColor"/>
                    <path d="M18 6v-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-chemistry': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l-2 4h4l-2-4z" fill="currentColor"/>
                    <path d="M8 6h8l2 12H6L8 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-water': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.2 3 5.4V20l3 2 3-2v-6.6c1.8-1.2 3-3.2 3-5.4 0-3.3-2.7-6-6-6z" fill="currentColor"/>
                </svg>
            `,
            
            'icon-volume': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 3l8 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-brick': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M3 9h18M3 15h18" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 3v18M15 3v18" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,
            
            'icon-sand': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 20h20M2 16h20M2 12h20M2 8h20M2 4h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-rock': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 20h20M4 16l2-4 3 3 4-6 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            
            'icon-lab': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 3h12l-1 16H7L6 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 19v3h6v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-paint': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16l4 4h8l4-4V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-money': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M12 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-clipboard': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 4V2M15 4V2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-download': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3v15M5 11l7 7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            
            'icon-reset': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'icon-settings': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'icon-recipes': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            // Tab icons
            'tab-icon-project': `
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'tab-icon-mix': `
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l-2 4h4l-2-4z" fill="currentColor"/>
                    <path d="M8 6h8l2 12H6L8 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            'tab-icon-cost': `
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'tab-icon-settings': `
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'tab-icon-inventory': `
                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 12h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,

            'icon-inventory-production': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 14h2v4H8z" fill="currentColor"/>
                    <path d="M14 14h2v4h-2z" fill="currentColor"/>
                </svg>
            `,

            'icon-inventory-order': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `,
            'icon-sync': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 12c0-4.4 3.6-8 8-8 2.5 0 4.7 1.1 6.2 2.8L20 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M20 12c0 4.4-3.6 8-8 8-2.5 0-4.7-1.1-6.2-2.8L4 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M20 4v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4 20v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,

            'icon-suppliers': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="8" width="14" height="10" rx="1" stroke="currentColor" stroke-width="2"/>
                    <path d="M15 11h4l3 4v3h-7V11z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="5" cy="19" r="2" fill="currentColor"/>
                    <circle cx="18" cy="19" r="2" fill="currentColor"/>
                </svg>
            `,

            'icon-business': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 10l9-7 9 7v11H3V10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <rect x="9" y="14" width="6" height="7" stroke="currentColor" stroke-width="2"/>
                </svg>
            `,

            'icon-tax': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M14 17l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="14.5" cy="17.5" r="1" fill="currentColor"/>
                    <circle cx="17.5" cy="13.5" r="1" fill="currentColor"/>
                </svg>
            `,

            'icon-po-history': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 7h6M7 11h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="18" cy="17" r="4" fill="white" stroke="currentColor" stroke-width="2"/>
                    <path d="M18 15v2l1 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
        };
    }

    // Inject icons into the page with error handling
    injectIcons() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.injectIcons());
            return;
        }

        // Inject all icons with error handling
        Object.entries(this.icons).forEach(([id, svg]) => {
            try {
                const element = document.getElementById(id);
                if (element) {
                    element.innerHTML = svg;
                    element.style.display = 'inline-block'; // Ensure icons are visible
                }
            } catch (error) {
                console.warn(`Failed to inject icon ${id}:`, error);
            }
        });
    }
}

// Initialize icon manager when module loads
const iconManager = new IconManager();
iconManager.injectIcons();

// Export for use in other modules
export { iconManager };