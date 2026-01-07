# Chat Widget for Framer

A simple, beautiful chat interface that can be deployed to Vercel and embedded in Framer websites.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to preview.

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/chat)

### Option 2: CLI Deploy

```bash
npm install -g vercel
vercel
```

## Embed in Framer

After deploying to Vercel, you'll get a URL like `https://your-chat.vercel.app`.

### Method 1: Framer Embed Component (Recommended)

1. Open your Framer project
2. Go to **Insert** menu (or press `/`)
3. Search for **Embed**
4. Drag the Embed component to your canvas
5. In the properties panel, paste your Vercel URL: `https://your-chat.vercel.app`
6. Adjust the size as needed (recommended: 400x600 for desktop)

### Method 2: Custom Code

Add this to your Framer page's custom code section:

```html
<iframe 
  src="https://your-chat.vercel.app" 
  width="400" 
  height="600" 
  style="border: none; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
></iframe>
```

### Responsive Embed

For a responsive chat widget that adapts to container size:

```html
<div style="width: 100%; max-width: 400px; height: 600px;">
  <iframe 
    src="https://your-chat.vercel.app" 
    width="100%" 
    height="100%" 
    style="border: none; border-radius: 16px;"
  ></iframe>
</div>
```

## Customization

### Styling

Edit `app/globals.css` to customize colors.

### AI Integration

To connect to a real AI backend, modify the `handleSend` function in `app/page.tsx`.

## Tech Stack

- Next.js 16
- TailwindCSS v4
- shadcn/ui
- TypeScript

## License

MIT
