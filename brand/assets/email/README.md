# GVP Email Signature Assets

Generated 2026-05-12.

## Horizontal lockup

- horizontal-lockup-1x.png : 320 px wide, for standard email signatures.
- horizontal-lockup-2x.png : 640 px wide, retina display variant. Reference at
  `width="320"` height in HTML so it renders sharp on high-DPI screens.

## Circular mark badge

- mark-circle-56.png : 56 x 56, standard email signature badge.
- mark-circle-112.png : 112 x 112, retina variant.

## Usage in HTML signature

```html
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-right: 16px;">
      <img src="https://grandvisionperspective.com/brand/assets/email/mark-circle-112.png"
           width="56" height="56" alt="GVP">
    </td>
    <td>
      <div style="font-family: Fraunces, Georgia, serif; font-size: 16px;
                   color: #1a1a2e; font-weight: 500;">Barrie</div>
      <div style="font-family: Manrope, sans-serif; font-size: 10px;
                   color: #6b6b7b; letter-spacing: 0.18em;
                   text-transform: uppercase;">FOUNDER</div>
      <div style="font-family: Fraunces, Georgia, serif; font-size: 13px;
                   color: #1a1a2e;">Grand Vision <i style="color:#c9a84c">Perspective</i></div>
    </td>
  </tr>
</table>
```
