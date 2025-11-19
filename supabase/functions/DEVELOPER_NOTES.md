# Developer Notes: VS Code & Deno import warnings

When opening the Edge Function TypeScript files in VS Code you may see a few compiler/linter warnings such as:

```
Cannot find module 'https://deno.land/std@.../http/server.ts'
Cannot find module 'https://esm.sh/@supabase/supabase-js@...'
Cannot find name 'Deno'
```

Why this happens:
- The Edge Function uses the Deno runtime and imports remote modules directly (Deno-style). VS Code's default TypeScript/Node resolver doesn't recognize remote Deno imports, so the editor shows warnings even though the code is valid for Supabase's Deno runtime.

How to handle these warnings:
1. Recommended: Install the official "Deno" VS Code extension and enable it for this workspace. This will allow VS Code to resolve Deno imports and remove the warnings.

   - Install: Search for "Deno" in the Extensions pane
   - Enable: Add or confirm these settings in `.vscode/settings.json`:

   ```json
   {
     "deno.enable": true,
     "deno.lint": true,
     "deno.unstable": false
   }
   ```

2. If you prefer not to enable the Deno extension, you can safely ignore these warnings — they are IDE-only. The Supabase Deno runtime will compile and run the function correctly when deployed.

3. Verification steps (what actually matters):
   - Deploy the function with the Supabase CLI: `supabase functions deploy daily-portfolio-update`
   - Invoke the function manually: `supabase functions invoke daily-portfolio-update`
   - Check runtime logs: `supabase functions logs daily-portfolio-update --tail`

If the logs show successful execution the IDE warnings can be disregarded.
