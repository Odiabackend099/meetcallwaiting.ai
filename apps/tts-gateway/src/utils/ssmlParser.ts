// utils/ssmlParser.ts
// SSML (Speech Synthesis Markup Language) parser and processor

export interface SSMLElement {
  type: 'speak' | 'p' | 's' | 'break' | 'emphasis' | 'prosody' | 'say-as' | 'phoneme' | 'text';
  attributes: Record<string, string>;
  content?: string;
  children?: SSMLElement[];
}

export interface ParsedSSML {
  elements: SSMLElement[];
  plainText: string;
  hasSSML: boolean;
}

export interface SpeechSettings {
  rate?: number;
  pitch?: number;
  volume?: number;
  emphasis?: 'strong' | 'moderate' | 'reduced';
  pause?: number;
}

export class SSMLParser {
  /**
   * Parse SSML markup into structured elements
   */
  static parse(ssml: string): ParsedSSML {
    try {
      // Check if input contains SSML tags
      const hasSSML = /<[^>]+>/.test(ssml);
      
      if (!hasSSML) {
        return {
          elements: [{ type: 'text', attributes: {}, content: ssml }],
          plainText: ssml,
          hasSSML: false
        };
      }

      // Clean and normalize SSML
      const cleanedSSML = this.cleanSSML(ssml);
      
      // Parse SSML elements
      const elements = this.parseElements(cleanedSSML);
      
      // Extract plain text
      const plainText = this.extractPlainText(elements);

      return {
        elements,
        plainText,
        hasSSML: true
      };
    } catch (error) {
      console.error('SSML parsing error:', error);
      // Return plain text as fallback
      return {
        elements: [{ type: 'text', attributes: {}, content: ssml }],
        plainText: ssml.replace(/<[^>]+>/g, ''), // Strip all tags
        hasSSML: false
      };
    }
  }

  /**
   * Process SSML and extract speech settings
   */
  static processSSML(parsedSSML: ParsedSSML): {
    text: string;
    settings: SpeechSettings;
    segments: Array<{
      text: string;
      settings: SpeechSettings;
    }>;
  } {
    const segments: Array<{ text: string; settings: SpeechSettings }> = [];
    let globalSettings: SpeechSettings = {};

    // Process elements and build segments
    this.processElements(parsedSSML.elements, segments, globalSettings);

    // If no segments were created, create a default one
    if (segments.length === 0) {
      segments.push({
        text: parsedSSML.plainText,
        settings: globalSettings
      });
    }

    // Combine all text
    const combinedText = segments.map(seg => seg.text).join(' ');

    return {
      text: combinedText,
      settings: globalSettings,
      segments
    };
  }

  /**
   * Clean and normalize SSML input
   */
  private static cleanSSML(ssml: string): string {
    // Remove XML declaration if present
    let cleaned = ssml.replace(/<\?xml[^>]*\?>/gi, '');
    
    // Ensure root speak tag
    if (!cleaned.trim().startsWith('<speak')) {
      cleaned = `<speak>${cleaned}</speak>`;
    }
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Parse SSML elements recursively
   */
  private static parseElements(ssml: string): SSMLElement[] {
    const elements: SSMLElement[] = [];
    let currentIndex = 0;

    while (currentIndex < ssml.length) {
      const openTagMatch = ssml.slice(currentIndex).match(/<(\w+)([^>]*)>/);
      
      if (!openTagMatch) {
        // No more tags, add remaining text
        const remainingText = ssml.slice(currentIndex).trim();
        if (remainingText) {
          elements.push({
            type: 'text',
            attributes: {},
            content: remainingText
          });
        }
        break;
      }

      const [fullMatch, tagName, attributesStr] = openTagMatch;
      const tagStart = currentIndex + openTagMatch.index!;
      const tagEnd = tagStart + fullMatch.length;

      // Add text before tag
      if (tagStart > currentIndex) {
        const textBefore = ssml.slice(currentIndex, tagStart).trim();
        if (textBefore) {
          elements.push({
            type: 'text',
            attributes: {},
            content: textBefore
          });
        }
      }

      // Parse attributes
      const attributes = this.parseAttributes(attributesStr);

      // Check if it's a self-closing tag
      if (fullMatch.endsWith('/>')) {
        elements.push({
          type: tagName as any,
          attributes,
          content: undefined
        });
        currentIndex = tagEnd;
        continue;
      }

      // Find closing tag
      const closingTag = `</${tagName}>`;
      const closingIndex = ssml.indexOf(closingTag, tagEnd);
      
      if (closingIndex === -1) {
        // Self-closing tag or malformed
        elements.push({
          type: tagName as any,
          attributes,
          content: undefined
        });
        currentIndex = tagEnd;
        continue;
      }

      // Get content between tags
      const content = ssml.slice(tagEnd, closingIndex);
      
      // Parse nested elements
      const children = this.parseElements(content);

      elements.push({
        type: tagName as any,
        attributes,
        content: content.trim(),
        children: children.length > 0 ? children : undefined
      });

      currentIndex = closingIndex + closingTag.length;
    }

    return elements;
  }

  /**
   * Parse attributes from attribute string
   */
  private static parseAttributes(attributesStr: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    const attributeRegex = /(\w+)=["']([^"']*)["']/g;
    let match;
    
    while ((match = attributeRegex.exec(attributesStr)) !== null) {
      const [, name, value] = match;
      attributes[name] = value;
    }
    
    return attributes;
  }

  /**
   * Extract plain text from elements
   */
  private static extractPlainText(elements: SSMLElement[]): string {
    let text = '';

    for (const element of elements) {
      if (element.type === 'text') {
        text += element.content || '';
      } else if (element.children) {
        text += this.extractPlainText(element.children);
      } else if (element.content) {
        text += element.content;
      }
    }

    return text.trim();
  }

  /**
   * Process elements and build segments with settings
   */
  private static processElements(
    elements: SSMLElement[],
    segments: Array<{ text: string; settings: SpeechSettings }>,
    currentSettings: SpeechSettings
  ): void {
    for (const element of elements) {
      const settings = { ...currentSettings };

      switch (element.type) {
        case 'text':
          if (element.content) {
            segments.push({
              text: element.content,
              settings
            });
          }
          break;

        case 'break':
          const duration = this.parseBreakDuration(element.attributes.time);
          segments.push({
            text: ' ', // Space for pause
            settings: { ...settings, pause: duration }
          });
          break;

        case 'emphasis':
          const emphasisLevel = element.attributes.level || 'moderate';
          segments.push({
            text: element.content || '',
            settings: { ...settings, emphasis: emphasisLevel as any }
          });
          break;

        case 'prosody':
          const prosodySettings = this.parseProsodyAttributes(element.attributes);
          const combinedSettings = { ...settings, ...prosodySettings };
          
          if (element.children) {
            this.processElements(element.children, segments, combinedSettings);
          } else if (element.content) {
            segments.push({
              text: element.content,
              settings: combinedSettings
            });
          }
          break;

        case 'say-as':
          // Handle say-as interpretation
          const interpretedText = this.interpretSayAs(element.content || '', element.attributes);
          segments.push({
            text: interpretedText,
            settings
          });
          break;

        case 'phoneme':
          // Use the text content for phoneme tags
          segments.push({
            text: element.content || '',
            settings
          });
          break;

        case 'p':
        case 's':
          // Paragraph and sentence tags
          if (element.children) {
            this.processElements(element.children, segments, settings);
          }
          // Add pause after paragraph
          if (element.type === 'p') {
            segments.push({
              text: ' ',
              settings: { ...settings, pause: 0.5 }
            });
          }
          break;

        default:
          // For other tags, process children or content
          if (element.children) {
            this.processElements(element.children, segments, settings);
          } else if (element.content) {
            segments.push({
              text: element.content,
              settings
            });
          }
          break;
      }
    }
  }

  /**
   * Parse break duration from time attribute
   */
  private static parseBreakDuration(timeStr?: string): number {
    if (!timeStr) return 0.25; // Default pause

    const timeMatch = timeStr.match(/(\d+(?:\.\d+)?)(s|ms)?/);
    if (!timeMatch) return 0.25;

    const [, value, unit] = timeMatch;
    const numValue = parseFloat(value);

    if (unit === 'ms') {
      return numValue / 1000; // Convert to seconds
    } else {
      return numValue; // Already in seconds
    }
  }

  /**
   * Parse prosody attributes
   */
  private static parseProsodyAttributes(attributes: Record<string, string>): SpeechSettings {
    const settings: SpeechSettings = {};

    if (attributes.rate) {
      settings.rate = this.parseRateValue(attributes.rate);
    }

    if (attributes.pitch) {
      settings.pitch = this.parsePitchValue(attributes.pitch);
    }

    if (attributes.volume) {
      settings.volume = this.parseVolumeValue(attributes.volume);
    }

    return settings;
  }

  /**
   * Parse rate value (e.g., "slow", "fast", "50%", "1.5x")
   */
  private static parseRateValue(rateStr: string): number {
    const lower = rateStr.toLowerCase();
    
    if (lower === 'x-slow') return 0.5;
    if (lower === 'slow') return 0.75;
    if (lower === 'medium') return 1.0;
    if (lower === 'fast') return 1.25;
    if (lower === 'x-fast') return 1.5;

    // Parse percentage
    const percentMatch = rateStr.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      return parseFloat(percentMatch[1]) / 100;
    }

    // Parse multiplier
    const multiplierMatch = rateStr.match(/(\d+(?:\.\d+)?)x/);
    if (multiplierMatch) {
      return parseFloat(multiplierMatch[1]);
    }

    // Parse direct number
    const numberMatch = rateStr.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      return parseFloat(numberMatch[1]);
    }

    return 1.0; // Default
  }

  /**
   * Parse pitch value
   */
  private static parsePitchValue(pitchStr: string): number {
    const lower = pitchStr.toLowerCase();
    
    if (lower === 'x-low') return 0.5;
    if (lower === 'low') return 0.75;
    if (lower === 'medium') return 1.0;
    if (lower === 'high') return 1.25;
    if (lower === 'x-high') return 1.5;

    // Parse percentage
    const percentMatch = pitchStr.match(/(\d+(?:\.\d+)?)%/);
    if (percentMatch) {
      return parseFloat(percentMatch[1]) / 100;
    }

    // Parse Hz value
    const hzMatch = pitchStr.match(/(\d+(?:\.\d+)?)hz/);
    if (hzMatch) {
      return parseFloat(hzMatch[1]) / 200; // Normalize to 200Hz baseline
    }

    return 1.0; // Default
  }

  /**
   * Parse volume value
   */
  private static parseVolumeValue(volumeStr: string): number {
    const lower = volumeStr.toLowerCase();
    
    if (lower === 'silent') return 0.0;
    if (lower === 'x-soft') return 0.25;
    if (lower === 'soft') return 0.5;
    if (lower === 'medium') return 0.75;
    if (lower === 'loud') return 1.0;
    if (lower === 'x-loud') return 1.25;

    // Parse dB value
    const dbMatch = volumeStr.match(/([+-]?\d+(?:\.\d+)?)db/);
    if (dbMatch) {
      const dbValue = parseFloat(dbMatch[1]);
      return Math.max(0, Math.min(2, 1 + dbValue / 20)); // Convert dB to 0-2 range
    }

    return 0.75; // Default
  }

  /**
   * Interpret say-as content
   */
  private static interpretSayAs(text: string, attributes: Record<string, string>): string {
    const interpretAs = attributes['interpret-as'] || 'characters';

    switch (interpretAs) {
      case 'characters':
        // Spell out characters
        return text.split('').join(' ');

      case 'digits':
        // Spell out digits
        return text.replace(/\d/g, (digit) => {
          const digits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
          return digits[parseInt(digit)] || digit;
        });

      case 'number':
        // Convert number to words
        return this.numberToWords(text);

      case 'date':
        // Format date
        return this.formatDate(text, attributes.format);

      case 'time':
        // Format time
        return this.formatTime(text, attributes.format);

      case 'telephone':
        // Format telephone number
        return this.formatTelephone(text);

      case 'currency':
        // Format currency
        return this.formatCurrency(text);

      default:
        return text;
    }
  }

  /**
   * Convert number to words (basic implementation)
   */
  private static numberToWords(text: string): string {
    const num = parseInt(text);
    if (isNaN(num)) return text;

    if (num < 20) {
      const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                     'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                     'seventeen', 'eighteen', 'nineteen'];
      return words[num] || text;
    }

    // For larger numbers, return the number as-is for now
    // In production, you'd want a more comprehensive number-to-words converter
    return text;
  }

  /**
   * Format date
   */
  private static formatDate(text: string, format?: string): string {
    try {
      const date = new Date(text);
      if (isNaN(date.getTime())) return text;

      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();

      return `${month} ${day}, ${year}`;
    } catch (error) {
      return text;
    }
  }

  /**
   * Format time
   */
  private static formatTime(text: string, format?: string): string {
    try {
      const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!timeMatch) return text;

      const [, hours, minutes, seconds] = timeMatch;
      const hour = parseInt(hours);
      const minute = parseInt(minutes);

      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

      let timeStr = `${displayHour}:${minutes} ${period}`;
      if (seconds) {
        timeStr = `${displayHour}:${minutes}:${seconds} ${period}`;
      }

      return timeStr;
    } catch (error) {
      return text;
    }
  }

  /**
   * Format telephone number
   */
  private static formatTelephone(text: string): string {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return text;
  }

  /**
   * Format currency
   */
  private static formatCurrency(text: string): string {
    const num = parseFloat(text.replace(/[$,]/g, ''));
    if (isNaN(num)) return text;

    return `$${num.toFixed(2)}`;
  }
}

export default SSMLParser;
