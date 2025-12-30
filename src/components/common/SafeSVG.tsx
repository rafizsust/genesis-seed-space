import { useState, useMemo } from 'react';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';

interface SafeSVGProps {
  svgCode: string | null | undefined;
  fallbackDescription?: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Safely renders SVG code with validation and error handling.
 * Shows a professional placeholder if SVG is invalid or missing.
 */
export function SafeSVG({ 
  svgCode, 
  fallbackDescription = 'Diagram content not available',
  className = '',
  maxWidth = 600,
  maxHeight = 400
}: SafeSVGProps) {
  const [hasError, setHasError] = useState(false);

  // Sanitize and validate SVG code with smart extraction for truncated output
  const sanitizedSvg = useMemo(() => {
    if (!svgCode || typeof svgCode !== 'string') {
      return null;
    }

    try {
      let svg = svgCode.trim();
      
      // Step 1: Extract SVG from markdown code blocks if present
      const codeBlockMatch = svg.match(/```(?:svg|xml)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        svg = codeBlockMatch[1].trim();
      }
      
      // Step 2: Try to find complete SVG (greedy match)
      let svgMatch = svg.match(/<svg[\s\S]*<\/svg>/i);
      
      // Step 3: Handle truncated SVG - find opening tag and attempt to repair
      if (!svgMatch) {
        const svgStartMatch = svg.match(/<svg[^>]*>/i);
        if (svgStartMatch) {
          const startIndex = svg.indexOf(svgStartMatch[0]);
          let svgContent = svg.substring(startIndex);
          
          // Check if SVG is truncated (missing closing tag)
          if (!svgContent.toLowerCase().includes('</svg>')) {
            console.warn('SafeSVG: SVG appears truncated, adding closing tag');
            svgContent = svgContent + '</svg>';
          }
          
          svg = svgContent;
        } else {
          console.warn('SafeSVG: No valid SVG tag found');
          return null;
        }
      } else {
        svg = svgMatch[0];
      }
      
      // Basic security: remove script tags and event handlers
      svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
      svg = svg.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      svg = svg.replace(/javascript:/gi, '');
      
      // Ensure proper viewBox for responsive sizing
      if (!svg.includes('viewBox')) {
        // Try to extract width/height and add viewBox
        const widthMatch = svg.match(/width=["']?(\d+)/);
        const heightMatch = svg.match(/height=["']?(\d+)/);
        const w = widthMatch ? parseInt(widthMatch[1]) : 800;
        const h = heightMatch ? parseInt(heightMatch[1]) : 600;
        svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
      }
      
      // Make SVG responsive by removing fixed width/height
      svg = svg.replace(/(<svg[^>]*)\swidth=["'][^"']*["']/i, '$1');
      svg = svg.replace(/(<svg[^>]*)\sheight=["'][^"']*["']/i, '$1');
      
      // Add responsive attributes and text overflow prevention styles
      const svgStyles = `
        max-width:100%;
        height:auto;
        display:block;
      `.replace(/\s+/g, '');
      
      // Inject a <style> tag for text overflow prevention if not already present
      const textOverflowStyles = `
        <style>
          text { 
            overflow: visible; 
            font-family: Arial, sans-serif;
          }
          .label-text {
            font-size: 12px;
            text-anchor: middle;
          }
        </style>
      `;
      
      // Add responsive attributes
      svg = svg.replace('<svg', `<svg preserveAspectRatio="xMidYMid meet" style="${svgStyles}"`);
      
      // Inject styles after opening svg tag if not already containing <style>
      if (!svg.includes('<style>')) {
        svg = svg.replace(/(<svg[^>]*>)/i, `$1${textOverflowStyles}`);
      }
      
      return svg;
    } catch (e) {
      console.error('SafeSVG: Error processing SVG:', e);
      return null;
    }
  }, [svgCode]);

  // Show placeholder if SVG is invalid or failed to render
  if (!sanitizedSvg || hasError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-muted/30 border border-border rounded-lg p-8 ${className}`}
        style={{ maxWidth, minHeight: 200 }}
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Diagram Unavailable</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/70 mb-4">
          <ImageIcon className="h-4 w-4" />
          <span className="text-sm">Visual representation could not be generated</span>
        </div>
        {fallbackDescription && (
          <div className="text-center text-sm text-muted-foreground bg-background/50 rounded-md p-4 max-w-md border border-border/50">
            <p className="font-medium mb-1">Description:</p>
            <p className="italic">{fallbackDescription}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`svg-container bg-background rounded-lg border border-border overflow-hidden ${className}`}
      style={{ maxWidth, maxHeight }}
    >
      <div
        className="w-full h-full flex items-center justify-center p-2"
        dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default SafeSVG;
