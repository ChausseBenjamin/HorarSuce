# Grade Progress Tracker Firefox Extension

A Firefox extension that adds grade progression graphs and trend analysis to UdeS grade sheets.

## Features

- **Progress Graph**: Shows cumulative grade percentage (y-axis) vs class completion percentage (x-axis)
- **Grade Trend**: Current average percentage excluding incomplete exams
- **Required Trend**: Average needed on remaining exams to reach 50% globally
- **Visual Reference**: Diagonal line showing perfect 100% progression

## Installation

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

## Testing

### Local Testing
1. Install the extension following the steps above
2. Open the sample HTML file: `file:///path/to/horarius-suce/sample/grille-notes.html`
3. The extension should automatically add graphs next to each class

### Live Site Testing
1. Navigate to `https://www.gegi.usherbrooke.ca/grille-notes`
2. Log in with your credentials (requires 2FA)
3. The extension should work on the live site as well

## How It Works

The extension:
1. Parses grade data from the page's grade tables
2. Calculates cumulative progression for each class
3. Creates canvas-based graphs showing progression vs completion
4. Displays trend analysis including current and required averages
5. Supports both light and dark modes

## Graph Interpretation

- **X-axis**: Class completion percentage (0-100%)
- **Y-axis**: Cumulative grade percentage (0-100%)
- **Diagonal line**: Perfect progression (always getting 100%)
- **Blue line**: Your actual progression
- **Blue dots**: Individual evaluation points

## Trend Analysis

- **Current Trend**: Your current average excluding incomplete exams
- **Required Trend**: Average needed on remaining exams to reach 50% globally
- Green text indicates good/achievable trends
- Red text indicates concerning/difficult trends