# Project styles and languages in the game template

CLI 3.2.1 is published with this template update. It adds
project-owned initialization without changing Core/UI APIs or migrating existing
projects. The empty template stays minimal.

## Files

- resource/config/style.json declares the primary font role and disabled-text color.
- resource/assets/fonts contains unmodified Chakra Petch regular (400) and bold (700)
  files, with OFL.txt. Source: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/chakrapetch).
- resource/config/locale.json enables English and selects en_US by default.
- resource/lang/lang_en_US.properties contains the scene title, button and descriptions.
- default.res.json registers locale_json and lang_en_US_properties in preload.
  style.json and fonts are read directly and need no manifest entries.

## Startup order

1. StyleManager reads and validates the stylesheet through published ui-document.
2. It loads every configured FontFace; only after all succeed does it register
   faces and publish the default CSS font family and numeric color palette.
3. Main sets TextField.default_fontFamily, then creates Player and the Preloader.
4. Main loads the manifest, theme and preload resources.
5. LocaleManager registers the enabled text files, selects the language and creates
   the translated scene. Startup errors are reported through console.error.

This ordering includes loading-screen Labels in the project font. The loading
screen's startup messages stay in English because translations are not loaded yet.
Templates do not implement live font/theme/language replacement.

## HTML brand splash

The game template's `web/index.html` presents `web/logo.png` beneath a small
"Made with" caption. The mascot makes a gentle entrance with two brief sparkles
and a soft blue glow, then floats while the entry module loads. The splash has
no loading text or progress indicator; the application's Preloader owns resource
progress. Animations stop when the browser requests reduced motion. The logo
size follows both viewport width and height for small screens and landscape.

The HTML overlay fades out after the entry module evaluates, without a minimum
display time or a wait for the entrance animation to finish. It does not wait
for project font or resource loading. Customize the branding directly in the
project's HTML. This template update applies to newly scaffolded game projects;
existing project HTML is project-owned.

## Change fonts and colors

Font keys such as primary produce stable aliases such as kurot-primary. Replace
files and update style.json resource-relative paths, retaining weight 400 and
unique weights. Default skins inherit the configured font; explicit Label fontFamily
values still override it. Existing stylesheet files must contain valid font definitions.
Keep the font's applicable license with any replacement distribution.

Label state colors use textColor.disabled="@style:colors:disabled-text". The CLI
compiles these references into numbers. Dynamic application code reads the same
palette through StyleManager.getColor('disabled-text'); enabled state behavior and
restoration of a normal color remain application responsibilities.

## Add languages

Use the Editor's language window to add a code, create its properties file and
update locale.json/default.res.json together. Only English is initially enabled.
Manual additions must use lang_<code>_properties text resources in preload.

LocaleManager accepts the project default or URL ?lang=fr / ?lang=fr_FR / ?lang=fr-FR.
A full code match wins, then a matching base language, then the configured default.
The default may be empty. Absent configuration or an empty language list clears registrations;
enabled languages with unavailable text resources or an invalid default fail before
publishing the new set. The last successful set is retained on initialization failure.

getString(key, ...args) reads the current translation, then English, then the key.
An explicitly empty translation remains empty. The simple properties format uses
one key=value per line, #/! comments, common escapes including newline/Unicode,
and {0}, {1} placeholders. Continuation lines and Java properties' colon-only
separators are not supported. UI translation is explicit; it is not an engine binding.
