# styles

mcbcode uses a dark, pixel-inspired interface built around high contrast, bright accent colors, custom minecraft-inspired typography, and simple rectangular UI elements.

the visual style is intended to feel technical and modern without losing the connection to minecraft.

## color system

the primary mcbcode palette is built around a near-black background, bright green accent, white text, and muted gray text.

| name               | value     | use                                              |
| ------------------ | --------- | ------------------------------------------------ |
| mcbcode green      | `#05ee93` | primary accent, links, active states, highlights |
| mcbcode dark green | `#00a459` | primary buttons and darker accent surfaces       |
| background         | `#0c0c0c` | main page background                             |
| surface            | `#121212` | cards, panels, and elevated surfaces             |
| code background    | `#111111` | code blocks and code-focused areas               |
| white              | `#ffffff` | primary headings and important text              |
| muted text         | `#bebebe` | secondary text and descriptions                  |
| pink               | `#e7007b` | secondary accent and syntax highlighting         |
| gold               | `#ffd23f` | secondary decorative accent                      |
| amethyst           | `#b06bff` | special features and alternate accent            |
| blue               | `#3498db` | syntax highlighting                              |

the core accent is `#05ee93`. it should be the first choice for links, active navigation, important interface elements, and visual emphasis.

```css
background: #0c0c0c;
color: #ffffff;
accent: #05ee93;
muted: #bebebe;
```

## backgrounds and surfaces

mcbcode primarily uses very dark surfaces instead of light panels.

the main background is:

```css
#0c0c0c
```

cards and elevated areas commonly use:

```css
#121212
```

code-focused areas use:

```css
#111111
```

semi-transparent surfaces are also used to create depth while keeping the background visible:

```css
rgba(18, 18, 18, 0.75)
```

glass-like elements may use `backdrop-filter: blur(...)` together with translucent backgrounds.

## typography

mcbcode uses custom minecraft-inspired fonts throughout the site.

### mcfont

`mcfont` is the primary interface font.

it is used for:

* body text
* paragraphs
* buttons
* inputs
* navigation
* general interface elements

```css
font-family: 'mcfont', sans-serif;
```

### mcfontb

`mcfontb` is the heavier display font.

it is primarily used for:

* `h1`
* `h2`
* `h3`
* large headings
* important buttons
* titles
* feature names

```css
font-family: 'mcfontb', sans-serif;
```

### mcfontwide

`mcfontwide` is an alternate display font used more sparingly for things such as labels, badges, and section descriptions.

```css
font-family: 'mcfontwide', sans-serif;
```

### monospace

code editors and code-focused interfaces use monospace fonts rather than the standard mcbcode fonts.

```css
font-family: monospace;
```

additional monospace fonts used across the site include fira code, ubuntu mono, and inconsolata.

## headings

headings should use white text and strong typography.

```css
h1,
h2,
h3 {
    font-family: 'mcfontb', sans-serif;
    color: #ffffff;
}
```

`h4` uses the standard `mcfont` font rather than the heavier display font.

headings should generally have a clear visual hierarchy rather than relying on excessive decoration.

## links

links use the primary green accent.

```css
a {
    color: #05ee93;
    text-decoration: none;
}
```

on hover, links may become more visually prominent with an accent glow.

```css
a:hover {
    color: #05ee93;
    text-shadow: 0 0 8px rgba(5, 238, 147, 0.25);
}
```

## borders

mcbcode generally uses subtle borders rather than heavy outlines.

common border values include:

```css
rgba(255, 255, 255, 0.1)
```

and:

```css
rgba(255, 255, 255, 0.12)
```

stronger borders may use:

```css
rgba(5, 238, 147, 0.35)
```

the goal is to separate elements without making every box scream for attention.

## border radius

the main mcbcode design language generally favors square or nearly square elements.

many site-wide styles explicitly use:

```css
border-radius: 0;
```

rounded corners should therefore be used sparingly and only where a component specifically calls for them.

## buttons

standard buttons use dark translucent backgrounds with subtle borders.

```css
background-color: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #ffffff;
```

on hover, buttons become brighter and may move slightly upward.

primary buttons use the mcbcode green accent:

```css
background-color: #00a459;
border: 1px solid #05ee93;
color: #ffffff;
```

primary buttons may also use the site's green glow animation.

## cards

cards are usually dark, translucent surfaces with thin borders.

```css
background: rgba(18, 18, 18, 0.75);
border: 1px solid rgba(255, 255, 255, 0.1);
```

cards may use:

```css
backdrop-filter: blur(12px);
```

for a subtle glass effect.

interactive cards can become slightly brighter and gain an accent border or shadow on hover.

## shadows

mcbcode uses large, soft shadows to separate elements from the dark background.

common examples include:

```css
box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
```

and:

```css
box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
```

accent elements may use a green glow:

```css
box-shadow: 0 0 15px rgba(5, 238, 147, 0.2);
```

shadows should generally remain soft rather than looking like black rectangles pasted behind components.

## animation

animation is used to add personality without making the interface constantly move for the sake of moving.

### fade in

pages and major sections may use a fade-and-slide entrance.

```css
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(15px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### accent glow

important green elements may use a slow pulsing glow.

```css
@keyframes auraPulse {
    0%, 100% {
        box-shadow: 0 0 15px rgba(5, 238, 147, 0.2);
    }

    50% {
        box-shadow: 0 0 35px rgba(5, 238, 147, 0.45);
    }
}
```

### gradients

gradients are primarily used for special headings and visual emphasis rather than every component on the page.

the site's main animated heading style uses white and mcbcode green:

```css
background: linear-gradient(
    90deg,
    #ffffff,
    #05ee93,
    #ffffff
);
```

## accent colors

mcbcode has a few secondary colors that can be used for special features or decorative elements.

### green

`#05ee93`

the primary mcbcode accent.

### pink

`#e7007b`

used as a secondary accent and for some syntax highlighting.

### amethyst

`#b06bff`

used for special features and alternate visual treatments, such as dripstoneai-related interfaces.

### gold

`#ffd23f`

used sparingly for decorative or playful elements.

secondary colors should not replace the primary green throughout the interface.

## scrollbar

the custom scrollbar follows the mcbcode palette.

the scrollbar track uses a dark surface:

```css
#121212
```

the scrollbar thumb uses:

```css
#232323
```

and becomes mcbcode green when hovered:

```css
#05ee93
```

the firefox equivalent uses the same green accent with a dark track.

## selection

text selection uses a transparent version of the mcbcode green accent.

```css
background: #05ee9340;
```

this keeps the browser's selection behavior consistent with the rest of the interface.

## layout

mcbcode layouts generally use:

* large amounts of breathing room
* centered content containers
* responsive grids
* dark sections separated by subtle borders
* strong left-aligned section headings
* flexible layouts that collapse cleanly on smaller screens

grids commonly use responsive columns such as:

```css
grid-template-columns: repeat(
    auto-fit,
    minmax(220px, 1fr)
);
```

## overall style

the mcbcode visual identity can be summarized as:

**dark + technical + minecraft-inspired + green accent + custom typography**

the interface should feel like a developer tool first, while still having enough visual personality to clearly belong to the minecraft ecosystem.

when adding a new component, prioritize the existing visual system rather than introducing a completely different design language.
