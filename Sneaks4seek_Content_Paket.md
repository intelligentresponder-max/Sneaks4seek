# Sneaks4seek — Content-Paket (ElevenLabs · CapCut · Gamma)

Stand: 16.08.2026. Basiert auf den echten Assets aus `archive/` und den Farbwerten aus `assets/css/theme.css`.

## Farb-/Font-Referenz (aus theme.css, exakt)

```
Kraftpapier:      #C4A67A
Kraftpapier dunkel:#AE8F62
Tinte (Text):      #1B1815
Sock-Weiß:         #F6F2E9
Stempel-Rot (CTA):  #C1442D
Gedämpftes Grau:    #8B8478

Display/Headlines: Oswald
Fließtext:         Inter
Mono/Zahlen:       IBM Plex Mono
```

Lime-Grün-Akzent (Entscheidung 13.08.) ist noch nicht in theme.css als Variable hinterlegt — beim Einbauen einen konkreten Hex-Wert festlegen und dort ergänzen, sonst driftet die Farbe zwischen den Formaten auseinander.

## Asset-Inventar

| Datei | Maße | Länge | Quelle |
|---|---|---|---|
| `spin360.mp4` | 1080×1920 | 7,1 s | archive/ (Sneakers4Seeker-Ära) |
| `combo.mp4` | 1080×1920 | 13,4 s | archive/ |
| `joker-spiral.webp` | — | Standbild | archive/, aus dem alten Glücksrad-Feature |
| `sox-1/2/3.jpg`, `magic-sox-1/2/3.jpg` | — | Standbild | archive/, Produktfotos Socken |
| `wotherspoon-zoom.jpg` | — | Standbild | Root, aktuell noch im Blog verlinkt |

---

## 1) ElevenLabs — Voiceover-Skripte

### Kanal-Intro — exakt auf spin360.mp4 (7,1 s) abgestimmt

> Sneaker verkaufen, ohne Stress. Formular ausfüllen — Angebot kommt in sieben Stunden.

13 Wörter, bei normalem Sprechtempo (~2 Wörter/Sek. für ruhige, sachliche Stimme) knapp unter 7 Sekunden. Stimme: „German, calm/professional" aus der Voice Library, 2–3 testen.

### Erklär-Voiceover — exakt auf combo.mp4 (13,4 s) abgestimmt

> Formular ausfüllen, Fotos hochladen. Innerhalb von sieben Stunden bekommst du ein Angebot. Sagst du zu, geht's mit DHL versichert raus — bezahlt wird sicher über Stripe.

Deckt alle vier Prozessschritte ab (Formular → Fotos → Angebot 7 h → DHL/Stripe), passt zeitlich zur Cliplänge.

### Produkt-Post-Vorlage (ohne festes Video, für einzelne Angebote)

> [Marke] [Modell], Größe [Größe]. Zustand: [Zustand]. [Preis] Euro, versichert versendet mit DHL.

Kurz genug für einen 5–6-Sekunden-Clip über ein einzelnes Produktfoto.

---

## 2) CapCut/Canva — Assembly-Plan

Timeline, Reihenfolge exakt nach den echten Cliplängen:

```
0:00–0:07  spin360.mp4 (voll) + Kanal-Intro-Audio
0:07–0:09  joker-spiral.webp, 2 Sek. als Übergang (abstrakt, keine Person)
0:09–0:22  combo.mp4 (voll) + Erklär-Audio
```

Textkarten: Oswald für Headlines, IBM Plex Mono für Zahlen/Preise. Hintergrund der Textkarten Kraftpapier `#C4A67A`, Schrift Tinte `#1B1815`, CTA-Button/Unterstreichung Stempel-Rot `#C1442D` — damit der Clip zur Website passt, nicht zum alten Volt-Grün-Look.

Für Produkt-Posts: einzelnes Produktfoto (`sox-*.jpg` als Platzhalter, später echte Verkäuferfotos aus den Onboarding-Uploads) + Produkt-Post-Vorlage als Audio, 5–6 Sek., gleiches Farbschema.

---

## 3) Gamma — Pinned-Post-Outline

Als Notizen einfügen, Gamma baut daraus die Slides:

```
Slide 1 — Titel: „Sneaker verkaufen. So funktioniert's."
Slide 2 — Schritt 1: Formular ausfüllen (Marke, Modell, Größe, Zustand)
Slide 3 — Schritt 2: Fotos & Videos hochladen — nur der Artikel, kein Zubehör
Slide 4 — Schritt 3: Angebot innerhalb von 7 Stunden
Slide 5 — Schritt 4: Zusage → DHL versichert, Zahlung über Stripe
Slide 6 — CTA: Link zum Formular, Kontakt für Rückfragen
```

---

## Zwei Hinweise, keine Umsetzung

**Das alte Glücksrad/Joker-Feature** (`magie.html`, hypnotischer Spiral-Overlay, „immer gewinnt"-Mechanik) ist eine verbreitete E-Commerce-Taktik, passt aber stilistisch nicht zum jetzigen, ruhigeren Vertrauens-Ton des Kraftpapier-Konzepts. Ich habe es hier bewusst nicht mit eingebaut — falls gewünscht, separat besprechen.

**Bild 2 aus dem Upload** (Füße/Beine mit Sneaker) eignet sich für Lifestyle-Content im Kanal, nicht für Onboarding-Uploads — dort gilt weiterhin die Nur-Artikel-Regel.
