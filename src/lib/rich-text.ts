const allowedTags = /<(?!\/?(?:p|br|strong|b|em|i|u|s|ul|ol|li|h1|h2|h3|blockquote|a)(?:\s|>|\/))[^>]*>/gi;

/** Keeps the limited formatting supported by the course editor and removes unsafe HTML. */
export const sanitizeCourseHtml = (value: unknown) => {
    const html = String(value ?? '')
        .replace(/<!--[^]*?-->/g, '')
        .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(allowedTags, '');

    return html
        .replace(/<a\b[^>]*>/gi, (tag) => {
            const href = tag.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]?.trim() || '';
            return /^(https?:\/\/|mailto:)/i.test(href) ? `<a href="${href}">` : '<a>';
        })
        .replace(/<(p|strong|b|em|i|u|s|ul|ol|li|h1|h2|h3|blockquote)\b[^>]*>/gi, '<$1>');
};

export const htmlToPlainText = (value: unknown) => sanitizeCourseHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/h[1-3]>|<\/li>|<\/blockquote>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
