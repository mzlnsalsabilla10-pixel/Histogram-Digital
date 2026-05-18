(function () {
    // Isi dua nilai ini dari Project Settings > API di dashboard Supabase.
    // Gunakan anon/public key saja di frontend. Jangan pernah menaruh service role key di file ini.
    const SUPABASE_URL = "https://iygkyuidociifyrpmxfp.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable__iaRrOJiRSohG65Ow9W6KQ_k6_bilcu";

    const isSupabaseConfigured =
        SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

    const clientFactory = window.supabase?.createClient;
    const supabase = isSupabaseConfigured && clientFactory
        ? clientFactory(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

    window.HistogramSupabase = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        isSupabaseConfigured: Boolean(isSupabaseConfigured && clientFactory),
        supabase
    };
})();
