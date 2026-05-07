(function () {
    const STUDENT_INTERNAL_DOMAIN = "kelas-penelitian.invalid";

    function getSupabaseState() {
        return window.HistogramSupabase || {
            isSupabaseConfigured: false,
            supabase: null
        };
    }

    function resolveLoginEmail(identifier) {
        const value = String(identifier || "").trim().toLowerCase();
        if (!value) return "";
        return value.includes("@") ? value : `${value}@${STUDENT_INTERNAL_DOMAIN}`;
    }

    function hasLegacyLogin() {
        return localStorage.getItem("login") === "true" && Boolean(localStorage.getItem("namaLengkap"));
    }

    function clearLegacyIdentity() {
        [
            "login",
            "namaLengkap",
            "kelompokNama",
            "kelompokKelas",
            "userType",
            "userId",
            "supabaseProfile"
        ].forEach((key) => localStorage.removeItem(key));
    }

    function syncLegacyProfile(profile, user = null) {
        if (!profile) return;

        localStorage.setItem("namaLengkap", profile.full_name || user?.email || "Peserta Didik");
        localStorage.setItem("kelompokNama", profile.group_name || "");
        localStorage.setItem("kelompokKelas", profile.class_name || "");
        localStorage.setItem("login", "true");
        localStorage.setItem("userType", profile.user_type || "mandiri");
        localStorage.setItem("userId", profile.id || user?.id || "");
        localStorage.setItem("supabaseProfile", JSON.stringify({
            userId: profile.id || user?.id || "",
            full_name: profile.full_name || "",
            class_name: profile.class_name || "",
            group_name: profile.group_name || "",
            user_type: profile.user_type || "mandiri"
        }));
    }

    function getLegacyProfile() {
        if (!hasLegacyLogin()) return null;

        return {
            id: localStorage.getItem("userId") || "",
            full_name: localStorage.getItem("namaLengkap") || "Peserta Didik",
            class_name: localStorage.getItem("kelompokKelas") || "",
            group_name: localStorage.getItem("kelompokNama") || "",
            user_type: localStorage.getItem("userType") || "mandiri"
        };
    }

    async function getCurrentUser() {
        const { isSupabaseConfigured, supabase } = getSupabaseState();
        if (!isSupabaseConfigured || !supabase) return null;

        const { data, error } = await supabase.auth.getUser();
        if (error) return null;
        return data.user || null;
    }

    async function getProfileByUserId(userId) {
        const { isSupabaseConfigured, supabase } = getSupabaseState();
        if (!isSupabaseConfigured || !supabase || !userId) return null;

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, username, student_code, class_name, group_name, user_type, is_active")
            .eq("id", userId)
            .maybeSingle();

        if (error || !data) return null;
        return data;
    }

    async function getCurrentProfile({ allowLegacyFallback = true } = {}) {
        const user = await getCurrentUser();
        if (user) {
            const profile = await getProfileByUserId(user.id);
            if (profile) {
                syncLegacyProfile(profile, user);
            }
            return profile;
        }

        const { isSupabaseConfigured } = getSupabaseState();
        if (!isSupabaseConfigured && allowLegacyFallback) {
            return getLegacyProfile();
        }

        return null;
    }

    async function requireLoggedIn({ redirectTo = "login.html" } = {}) {
        const profile = await getCurrentProfile({ allowLegacyFallback: true });

        if (!profile) {
            clearLegacyIdentity();
            window.location.href = redirectTo;
            return null;
        }

        return profile;
    }

    async function signOutAndReset({ redirectTo = "login.html" } = {}) {
        const { isSupabaseConfigured, supabase } = getSupabaseState();
        if (isSupabaseConfigured && supabase) {
            await supabase.auth.signOut();
        }

        clearLegacyIdentity();
        window.location.href = redirectTo;
    }

    function formatGreeting(profile) {
        const name = profile?.full_name || "Peserta Didik";
        return profile?.group_name ? `Halo, <span>${name}</span> — ${profile.group_name}` : `Halo, <span>${name}</span>`;
    }

    async function getCurrentIdentity({ allowLegacyFallback = true } = {}) {
        const profile = await getCurrentProfile({ allowLegacyFallback });
        if (!profile) return null;

        return {
            userId: profile.id || localStorage.getItem("userId") || "",
            full_name: profile.full_name || "",
            namaLengkap: profile.full_name || "",
            class_name: profile.class_name || "",
            kelompokKelas: profile.class_name || "",
            group_name: profile.group_name || "",
            kelompokNama: profile.group_name || "",
            user_type: profile.user_type || "mandiri",
            userType: profile.user_type || "mandiri"
        };
    }

    window.HistogramAuth = {
        resolveLoginEmail,
        getCurrentUser,
        getProfileByUserId,
        getCurrentProfile,
        requireLoggedIn,
        signOutAndReset,
        syncLegacyProfile,
        clearLegacyIdentity,
        formatGreeting,
        getCurrentIdentity,
        get isSupabaseConfigured() {
            return getSupabaseState().isSupabaseConfigured;
        },
        get supabase() {
            return getSupabaseState().supabase;
        }
    };
})();
