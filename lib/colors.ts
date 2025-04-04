/**
 * Extract a color palette from an image URL
 * Uses the canvas API to analyze colors in an image
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get a color palette from an image URL
 * @param imageUrl - URL of the image to analyze
 * @returns Promise that resolves to an array of hex color strings
 */
export async function getPaletteFromURL(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Make canvas small for faster processing
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        
        // Draw image to canvas scaled down
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, size, size).data;
        
        // Sample pixels and collect colors
        const colorBuckets: Record<string, number> = {};
        const colors: RGB[] = [];
        
        // Sample at regular intervals (not every pixel)
        const sampleInterval = 4; // Every 4 pixels
        
        // Analyze pixels and group similar colors
        for (let i = 0; i < imageData.length; i += 4 * sampleInterval) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Create a simplified key for the color (round to nearest 10)
          const key = `${Math.round(r/15)*15}-${Math.round(g/15)*15}-${Math.round(b/15)*15}`;
          
          // Count occurrences of this color
          if (colorBuckets[key]) {
            colorBuckets[key]++;
          } else {
            colorBuckets[key] = 1;
            // Add to the colors array only the first time we see it
            colors.push({ r, g, b });
          }
        }
        
        // Sort colors by frequency
        const sortedColors = Object.entries(colorBuckets)
          .sort((a, b) => b[1] - a[1])
          .map(entry => {
            const [r, g, b] = entry[0].split('-').map(Number);
            return rgbToHex(r, g, b);
          });
        
        // Limit to 5 colors
        const palette = sortedColors.slice(0, 5);
        
        // Resolve with the colors in hex format
        resolve(palette);
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = (err) => {
      reject(err);
    };
    
    img.src = imageUrl;
  });
}

/**
 * Darkens a hex color by a specified amount
 * @param hex - The hex color to darken
 * @param amount - Amount to darken (0-1)
 */
export function darkenColor(hex: string, amount: number = 0.3): string {
  if (!hex.startsWith('#')) {
    return hex;
  }
  
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  
  return rgbToHex(r, g, b);
} 