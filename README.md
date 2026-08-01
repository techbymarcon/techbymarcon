# Marcon's Tech Haven

Create a responsive tech blog website inspired by Google's Material Design 3 website (m3.material.io).

The website should look like an official Google product documentation site.

STYLE:
- Material Design 3 aesthetic
- Light mode default, buttons of different colors 
- Large clean typography
- Lots of whitespace
- Rounded corners everywhere (24-32px)
- Modern cards
- Soft shadows
- Smooth Google-style animations
- Minimal, professional, clean UI

FONT:
Use Google Sans as the primary font.
Fallback to Roboto.
Use Material typography scale:
- Hero title: 72px desktop, 48px tablet, 36px mobile
- Section titles: 40px
- Article titles: 28px
- Body text: 16-18px
Use medium font weights and generous line spacing.

COLORS:
make a button for light/dark mode. Light mode is white with details of different pastel colors (photos as reference)


NAVIGATION:
Create a fixed left navigation rail similar to m3.material.io. and fourth photo

Width:
90px desktop.

The navbar contains:
Articles

About

Socials

Each item has:
- Material Symbols Rounded icon
- Small label below icon
- Rounded active indicator
- Hover animation

On mobile:
Convert it into a bottom navigation bar.

MAIN PAGE:
Create a large hero section like Google's Material Design homepage.

Include:
- Huge title "Tech by Marcon 
- Short description: Find the downloads and links of my guides.
- Primary "View Articles" button
- Large featured image/banner
- Smooth entrance animation

BLOG SYSTEM:
Create article cards with:

- Cover image
- Category badge
- Article title
- Description
- Date
- Reading time

Layout:
- One large featured article
- Responsive grid below
- Masonry-style cards

CARD DESIGN:
Cards should have:
- 24px rounded corners
- Soft elevation
- 24px padding
- Smooth hover animation

Hover:
- Slightly increase size (1.02)
- Raise card upward
- Increase shadow
- Brighten surface

Animation:
300ms cubic-bezier(.2,0,.2,1)

MATERIAL ANIMATIONS:
Use Google Material Motion style:
- Fade in
- Slide up
- Scale transitions
- Container transform
- Ripple effects
- Smooth page transitions
- Scroll reveal animations

Avoid flashy animations.

BUTTONS:
Use Material 3 buttons:
- Filled button
- Tonal button
- Outlined button
- Icon buttons

Buttons should have:
- 28px radius
- Ripple effect
- Hover elevation

ICONS:
Use Material Symbols Rounded.
Filled icons for active states.
Outlined icons for inactive states.

FEATURES:
Add:
- Search system with "/" keyboard shortcut
- Article filtering by category
- Smooth navigation
- Dark/light mode toggle
- Back-to-top floating action button

create a login system too. for users and developers. if in email you type developer and as password "developerpassword" you unlock develope mode: where developes can add or remove, change photos, text of an article.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://techbymarcon.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/038a1fc6-930c-4886-be97-4231d5a72619).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
