# Concrete Mix Calculator PWA

A professional concrete mix calculator for paver production, built as a Progressive Web App (PWA) using HTML, CSS, JavaScript, and Rust WASM.

## Features

- **Professional Calculator**: Complete concrete mix calculations for paver production
- **Mobile-First Design**: Optimized for mobile devices with responsive layout
- **Rust WASM Performance**: Core calculations run at near-native speed using WebAssembly
- **Offline Capable**: Works without internet connection after first load
- **Installable**: Can be installed as a native app on mobile devices
- **Export Options**: Copy summary to clipboard or download as CSV
- **No Frameworks**: Pure HTML/CSS/JavaScript - no React, Vue, or other frameworks

## Architecture

### Frontend (Pure JavaScript)
- **HTML**: Semantic markup with accessibility features
- **CSS**: Mobile-first responsive design with CSS variables for theming
- **JavaScript**: Vanilla JS with modern ES6+ features
- **State Management**: Reactive state with automatic UI updates

### Backend (Rust WASM)
- **Rust**: High-performance calculation engine
- **WebAssembly**: Compiled to WASM for browser execution
- **serde**: JSON serialization/deserialization
- **wasm-bindgen**: JavaScript/Rust interoperability

### PWA Features
- **Service Worker**: Offline caching and background sync
- **Manifest**: App metadata for installation
- **Icons**: Multiple sizes for different devices

## Project Structure

```
sprat-pwa/
├── index.html              # Main HTML shell
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline functionality
├── css/
│   └── styles.css          # Mobile-first CSS styles
├── js/
│   └── app.js              # Main application logic
├── wasm/
│   ├── Cargo.toml          # Rust project config
│   └── src/
│       └── lib.rs          # Calculation engine
└── README.md               # This file
```

## Installation & Building

### Prerequisites
- Rust and Cargo
- wasm-pack

### Building the WASM Module

1. Install wasm-pack:
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

2. Build the WASM module:
   ```bash
   cd sprat-pwa/wasm
   wasm-pack build --target web --out-dir ../wasm/pkg
   ```

3. Serve the application:
   ```bash
   cd sprat-pwa
   python -m http.server 8000
   # or
   npx serve .
   ```

4. Open in browser: `http://localhost:8000`

## Usage

### Project Setup Tab
- Configure paver dimensions (length, width, thickness)
- Set production parameters (quantity, waste factor)
- Configure labour and transport costs

### Mix Design Tab
- **Addition A**: Cementitious materials (Portland, White, Custom)
- **Addition B**: Fine aggregates (Sand, Stone Dust, GCC 400)
- **Addition C**: Coarse aggregates (Gravel types, Stone Dust, GCC 400)
- **Water**: W/C ratio and wet cast factor
- **Admixtures**: Micro fibre, macro fibre, water reducer, hardener
- **Pigments**: Color pigments with custom ratios

### Costs Tab
- View detailed cost breakdown
- Labour and transport cost calculations
- Export options for sharing results

### Prices Tab
- Configure material prices
- Reset to default prices

## Key Features Implemented

### Core Calculations
- Volume calculations with waste factors
- Weight-based cement calculations
- Fine and coarse aggregate proportions
- Water calculations with 80/20 split
- Admixture calculations (micro fibre, macro fibre, water reducer, hardener)
- Pigment calculations with custom ratios
- Complete cost analysis

### UI/UX Features
- Tabbed interface with smooth navigation
- Real-time calculations and updates
- Mobile-optimized input controls
- Responsive design for all screen sizes
- Dark mode support
- Accessibility features

### PWA Features
- Offline functionality
- Installable on mobile devices
- Service worker for caching
- App manifest with icons

### Export Features
- Copy summary to clipboard (WhatsApp/Email format)
- Download detailed CSV report
- Mobile-friendly copy functionality

## Technical Details

### Rust WASM Integration
The calculator uses Rust compiled to WebAssembly for performance:
- All calculations run in Rust for speed
- JavaScript handles UI and state management
- JSON serialization for data exchange
- Error handling and validation

### Performance Optimizations
- WASM calculations run at near-native speed
- Efficient state updates only when needed
- Minimal DOM manipulation
- Optimized CSS for smooth animations

### Browser Support
- Modern browsers with WASM support
- Progressive enhancement for older browsers
- Mobile-first responsive design
- Touch-friendly interface

## Development

### Code Style
- Modern ES6+ JavaScript
- Rust with serde for data handling
- CSS with variables for theming
- Semantic HTML for accessibility

### Testing
- Manual testing of all calculation functions
- Cross-browser compatibility testing
- Mobile device testing
- PWA functionality testing


## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the browser console for errors
- Ensure WASM module is built correctly
- Verify all files are served from a web server (not file://)
- Test in modern browsers with WASM support