# Climate Reanalyzer UI

A web application for visualizing climate data from the Climate Reanalyzer at the University of Maine. This is a standalone application built with plain HTML, CSS, and JavaScript - **no build tools or npm required to run**.

## Features

- **Daily Temperature Maps**: Interactive temperature overlays with zoom and navigation controls
- **Precipitation Data**: Rainfall and precipitation pattern visualization
- **Sea Surface Temperature**: Ocean thermal data mapping
- **Jetstream Patterns**: Atmospheric wind current visualization
- **Ice and Snow Coverage**: Polar ice extent data

## Project Structure

```
├── index.html                    # Main landing page - OPEN THIS FILE
├── daily-temperature.html        # Daily temperature search page (fully functional)
├── precipitation.html            # Precipitation search page (placeholder)
├── sea-surface-temperature.html  # Sea surface temperature page (placeholder)
├── ice-snow-coverage.html        # Ice and snow coverage page (placeholder)
├── jetstream.html                # Jetstream page (placeholder)
├── styles.css                    # Main stylesheet
├── script.js                     # Main navigation JavaScript
├── daily-temperature.js          # Daily temperature page functionality
├── assets/                       # Images and logo files
└── package.json                  # Only needed for testing with Playwright
```

## Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with responsive design
- **Vanilla JavaScript**: Interactive functionality without frameworks
- **Google Fonts**: Inria Serif typography

## Getting Started

**Simply open `index.html` in your web browser!**

### Option 1: Double-click to open

1. Navigate to the project folder
2. Double-click `index.html`
3. Your default browser will open the application

### Option 2: Drag and drop

1. Open your web browser
2. Drag `index.html` from your file manager into the browser window

### Option 3: File menu

1. Open your web browser
2. Use File > Open File and select `index.html`

## Development

- **Main Page**: Edit `index.html` for the landing page
- **Individual Pages**: Each feature has its own HTML file
- **Styling**: All styles are in `styles.css`
- **JavaScript**: Page-specific functionality in separate JS files

## Testing (Optional)

If you want to run automated tests:

```bash
npm install    # Install Playwright for testing
npm test       # Run tests
```

## Features Status

### Daily Temperature (Fully Functional)

- ✅ Interactive map viewer with zoom controls
- ✅ X/Y coordinate navigation
- ✅ Tile-based image loading
- ✅ Suggested historical temperature maps

### Other Climate Data (Placeholders)

- 🔄 Precipitation maps
- 🔄 Sea surface temperature maps
- 🔄 Jetstream wind maps
- 🔄 Ice/Snow coverage maps

## Migration from React

This project was originally built with React, TypeScript, and Vite. It has been successfully converted to use plain HTML, CSS, and JavaScript while maintaining all the original functionality and design.

### Changes Made:

- Removed React components and replaced with HTML
- Converted TypeScript to vanilla JavaScript
- Replaced React Router with simple page navigation
- Maintained original styling and user experience
- **Eliminated all build tools and npm requirements for running the app**

## Team

V-Model Violets at the University of Maine
