# NordPrint Studio: webbplats och CMS

Next.js 15, React 19, Tailwind 4 och three.js. Allt innehåll redigeras i adminpanelen på `/admin`.

## Kom igång

```bash
npm install
cp .env.example .env.local   # sätt ADMIN_PASSWORD och SESSION_SECRET
npm run dev                  # http://localhost:3000
```

Produktion: `npm run build && npm start`.

## Webbplatsen

Svenska ligger i roten och engelska under `/en`. Förstagångsbesökare vars webbläsare inte är inställd på ett nordiskt språk skickas till `/en`. Språkvalet sparas i en cookie.

| Svenska | Engelska | Innehåll |
| --- | --- | --- |
| `/` | `/en` | 3D-animation där vasen printas lager för lager, utvalda produkter, tjänster, beställningsprocess, om oss, vanliga frågor |
| `/produkter` | `/en/products` | Alla produkter, filtrerbara på kategori |
| `/produkter/[slug]` | `/en/products/[slug]` | Produktsida med bilder, färger och länk till Instagram-inlägget |
| `/bestall` | `/en/order` | Beställningsformulär med filuppladdning (bilder, STL, 3MF, OBJ, STEP, PDF) |
| `/villkor` | `/en/terms` | Köpvillkor |

Texterna i gränssnittet (knappar, etiketter, felmeddelanden) finns i `src/lib/i18n.ts`. Allt övrigt redigeras i adminpanelen. Engelska fält som lämnas tomma visar den svenska texten.

Produktbilderna i `public/images/products/` är skärmdumpar av inläggen på Instagram och bör ersättas med originalfilerna (ladda upp dem på respektive produkt i adminpanelen). Logotypen är ritad efter Instagram-profilen och kan ersättas med originalfilen under Sidinnehåll.

## Adminpanelen (`/admin`)

- **Översikt**: nya och pågående förfrågningar, produkter som saknar foto
- **Produkter**: skapa, redigera, radera, sortera, publicera och dölja. Svensk och engelsk text i flikar, bilduppladdning, färger, kategori, pris eller pris på förfrågan
- **Chatt**: svara besökare som skriver i chatten på webbplatsen. Olästa meddelanden syns som en siffra i menyn och i webbläsarfliken, och nya meddelanden dyker upp av sig själva. Chattar kan avslutas (flyttas till Avslutade, öppnas igen om kunden skriver) eller raderas. Har kunden lämnat e-post kan du också svara via mejl
- **Förfrågningar**: inkorg för beställningar (märkta EN om de skickats från den engelska sidan) med status (ny, pågår, klar, arkiverad), egna anteckningar, bifogade filer och svar via e-post
- **Sidinnehåll**: logotyp, alla texter på webbplatsen på båda språken, tjänster, steg, vanliga frågor, köpvillkor och kontaktuppgifter

## Lagring

| | Lokalt | På Vercel |
| --- | --- | --- |
| Innehåll (texter, produkter, förfrågningar) | `data/content.json` | Upstash Redis |
| Chattar | `data/chats.json` | Upstash Redis (egna nycklar, `nordprint:chat*`) |
| Uppladdade filer | `data/uploads/` | Vercel Blob |

Vilket som används avgörs av miljövariablerna. Utan Redis på Vercel är chatten avstängd och syns inte på webbplatsen. Första gången fylls lagringen med innehållet i `data/seed.json`.

På Vercel laddar webbläsaren upp filer direkt till Vercel Blob (via `/api/upload`), så kunder kan skicka 3D-filer upp till 20 MB trots Vercels gräns på 4,5 MB per anrop. Kundernas filer får slumpmässiga adresser som inte går att gissa, men den som har länken kan öppna filen.

## Driftsättning på Vercel

1. **Importera repot** på [vercel.com/new](https://vercel.com/new). Next.js upptäcks automatiskt, inga byggsteg behöver ändras.
2. **Lägg till miljövariabler** under Settings → Environment Variables:
   - `ADMIN_PASSWORD`: lösenordet till `/admin`
   - `SESSION_SECRET`: en lång slumpmässig sträng, till exempel från `openssl rand -hex 32`
3. **Koppla lagring** under Storage:
   - **Upstash for Redis** (Marketplace). Sätter `KV_REST_API_URL` och `KV_REST_API_TOKEN`.
   - **Blob** (publik). Sätter `BLOB_STORE_ID` (OIDC, Vercels standard) eller `BLOB_READ_WRITE_TOKEN`. Båda fungerar.
4. **Gör en ny deploy** så att variablerna kommer med (Deployments → Redeploy).

Utan Redis visas webbplatsen med startinnehållet, men inget kan sparas, och adminpanelen visar en varning om det.

Kör lokalt mot samma lagring som produktionen med `vercel env pull .env.local` (kräver Vercel CLI).
