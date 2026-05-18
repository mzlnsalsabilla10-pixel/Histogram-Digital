(function () {
    const STATUS_CLASS = {
        success: "is-success",
        error: "is-error",
        info: "is-neutral"
    };

    function getSupabaseClient() {
        return window.HistogramSupabase?.supabase || window.HistogramAuth?.supabase || null;
    }

    function isSupabaseReady() {
        return Boolean(window.HistogramSupabase?.isSupabaseConfigured && getSupabaseClient());
    }

    async function getResponseIdentity() {
        if (window.HistogramAuth?.getCurrentIdentity) {
            const identity = await window.HistogramAuth.getCurrentIdentity({ allowLegacyFallback: true });
            if (identity) return identity;
        }

        return {
            userId: localStorage.getItem("userId") || "",
            namaLengkap: localStorage.getItem("namaLengkap") || "Peserta Didik",
            full_name: localStorage.getItem("namaLengkap") || "Peserta Didik",
            userType: localStorage.getItem("userType") || "mandiri",
            user_type: localStorage.getItem("userType") || "mandiri",
            kelompokNama: localStorage.getItem("kelompokNama") || "",
            group_name: localStorage.getItem("kelompokNama") || "",
            kelompokKelas: localStorage.getItem("kelompokKelas") || "",
            class_name: localStorage.getItem("kelompokKelas") || ""
        };
    }

    function getResponseScope(identity) {
        const userType = identity?.userType || identity?.user_type || "mandiri";
        const groupName = identity?.kelompokNama || identity?.group_name || "";
        return userType === "siswa_penelitian" && Boolean(groupName) ? "kelompok" : "individu";
    }

    function buildResponseQuery(activityKey, questionKey, identity) {
        const scope = getResponseScope(identity);

        if (scope === "kelompok") {
            return {
                response_scope: scope,
                class_name: identity.kelompokKelas || identity.class_name || "",
                group_name: identity.kelompokNama || identity.group_name || "",
                activity_key: activityKey,
                question_key: questionKey
            };
        }

        return {
            response_scope: scope,
            user_id: identity.userId || identity.id || "",
            activity_key: activityKey,
            question_key: questionKey
        };
    }

    function applyQuery(builder, query) {
        return Object.entries(query).reduce((nextBuilder, [key, value]) => nextBuilder.eq(key, value), builder);
    }

    function buildPayload(activityKey, questionKey, answerText, identity) {
        const scope = getResponseScope(identity);
        const payload = {
            response_scope: scope,
            user_id: scope === "individu" ? identity.userId : null,
            class_name: scope === "kelompok" ? identity.kelompokKelas : null,
            group_name: scope === "kelompok" ? identity.kelompokNama : null,
            activity_key: activityKey,
            question_key: questionKey,
            answer_text: answerText,
            updated_by: identity.userId || null,
            updated_by_name: identity.namaLengkap || identity.full_name || "Peserta Didik",
            updated_at: new Date().toISOString()
        };

        return payload;
    }

    async function saveLearningResponse(activityKey, questionKey, answerText) {
        const trimmedAnswer = String(answerText || "").trim();
        if (!trimmedAnswer) {
            return { ok: false, type: "empty", message: "Jawaban masih kosong. Isi jawaban terlebih dahulu sebelum menyimpan." };
        }

        if (!isSupabaseReady()) {
            return { ok: false, type: "error", message: "Koneksi database belum siap. Periksa konfigurasi Supabase terlebih dahulu." };
        }

        const identity = await getResponseIdentity();
        if (!identity?.userId) {
            return { ok: false, type: "error", message: "Sesi login belum terbaca. Silakan login ulang terlebih dahulu." };
        }

        const scope = getResponseScope(identity);
        if (scope === "kelompok" && (!identity.kelompokKelas || !identity.kelompokNama)) {
            return { ok: false, type: "error", message: "Data kelompok belum lengkap. Hubungi guru/admin." };
        }

        const supabase = getSupabaseClient();
        const query = buildResponseQuery(activityKey, questionKey, identity);
        const payload = buildPayload(activityKey, questionKey, trimmedAnswer, identity);

        const selectResult = await applyQuery(
            supabase.from("learning_responses").select("id").limit(1),
            query
        ).maybeSingle();

        if (selectResult.error) {
            return { ok: false, type: "error", message: "Jawaban belum bisa disimpan. Coba beberapa saat lagi." };
        }

        const result = selectResult.data
            ? await supabase.from("learning_responses").update(payload).eq("id", selectResult.data.id).select("id").single()
            : await supabase.from("learning_responses").insert(payload).select("id").single();

        if (result.error) {
            return { ok: false, type: "error", message: "Jawaban belum bisa disimpan. Pastikan tabel dan RLS sudah disiapkan." };
        }

        return {
            ok: true,
            scope,
            message: scope === "kelompok" ? "Jawaban kelompok berhasil disimpan." : "Jawaban berhasil disimpan."
        };
    }

    async function loadLearningResponse(activityKey, questionKey) {
        if (!isSupabaseReady()) {
            return { ok: false, type: "error", message: "Koneksi database belum siap. Periksa konfigurasi Supabase terlebih dahulu." };
        }

        const identity = await getResponseIdentity();
        if (!identity?.userId) {
            return { ok: false, type: "error", message: "Sesi login belum terbaca. Silakan login ulang terlebih dahulu." };
        }

        const query = buildResponseQuery(activityKey, questionKey, identity);
        const result = await applyQuery(
            getSupabaseClient()
                .from("learning_responses")
                .select("answer_text, updated_by_name, updated_at")
                .order("updated_at", { ascending: false })
                .limit(1),
            query
        ).maybeSingle();

        if (result.error) {
            return { ok: false, type: "error", message: "Jawaban terbaru belum bisa dimuat. Coba beberapa saat lagi." };
        }

        if (!result.data) {
            return { ok: false, type: "empty", message: "Belum ada jawaban yang tersimpan." };
        }

        return {
            ok: true,
            message: "Jawaban terbaru berhasil dimuat.",
            response: result.data
        };
    }

    function applyLoadedResponseToField(fieldOrSelector, response) {
        const field = typeof fieldOrSelector === "string" ? document.querySelector(fieldOrSelector) : fieldOrSelector;
        if (!field || !response) return false;
        field.value = response.answer_text || "";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }

    function showResponseStatus(container, message, type = "info") {
        const target = typeof container === "string" ? document.querySelector(container) : container;
        if (!target) return;
        target.className = `learning-response-status validation-message ${STATUS_CLASS[type] || STATUS_CLASS.info}`;
        target.textContent = message;
        target.hidden = false;
    }

    function createControls(config, identity, scope) {
        const wrapper = document.createElement("div");
        wrapper.className = "learning-response-tools";
        wrapper.dataset.learningResponseKey = `${config.activityKey}:${config.questionKey}`;

        const info = document.createElement("p");
        info.className = "learning-response-info";
        info.textContent = scope === "kelompok"
            ? "Jawaban ini digunakan bersama oleh anggota kelompokmu."
            : "Jawaban ini tersimpan untuk akunmu sendiri.";

        const actions = document.createElement("div");
        actions.className = "learning-response-actions";

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = config.buttonClass || "button learning-response-btn";
        saveButton.textContent = scope === "kelompok" ? "Simpan Jawaban Kelompok" : "Simpan Jawaban";

        const loadButton = document.createElement("button");
        loadButton.type = "button";
        loadButton.className = config.secondaryButtonClass || "button learning-response-btn secondary";
        loadButton.textContent = "Muat Jawaban Terbaru";

        const status = document.createElement("p");
        status.className = "learning-response-status validation-message";
        status.hidden = true;

        actions.append(saveButton);
        if (scope === "kelompok") {
            actions.append(loadButton);
        }
        wrapper.append(info, actions, status);

        saveButton.addEventListener("click", async () => {
            saveButton.disabled = true;
            const answerText = config.getValue();
            const result = await saveLearningResponse(config.activityKey, config.questionKey, answerText);
            showResponseStatus(status, result.message, result.ok ? "success" : result.type === "empty" ? "info" : "error");
            saveButton.disabled = false;
        });

        if (scope === "kelompok") {
            loadButton.addEventListener("click", async () => {
                loadButton.disabled = true;
                const result = await loadLearningResponse(config.activityKey, config.questionKey);

                if (result.ok) {
                    config.applyValue(result.response);
                    const updater = result.response.updated_by_name ? ` Terakhir diperbarui oleh ${result.response.updated_by_name}.` : "";
                    showResponseStatus(status, `${result.message}${updater}`, "success");
                } else {
                    showResponseStatus(status, result.message, result.type === "empty" ? "info" : "error");
                }

                loadButton.disabled = false;
            });
        }

        return wrapper;
    }

    async function saveMultipleLearningResponses(items) {
        const results = [];

        for (const item of items) {
            const answerText = typeof item.getValue === "function" ? item.getValue() : item.answerText;
            const result = await saveLearningResponse(item.activityKey, item.questionKey, answerText);
            results.push({ ...result, item });

            if (!result.ok) {
                return {
                    ok: false,
                    results,
                    message: result.type === "empty"
                        ? "Lengkapi jawaban kelompok terlebih dahulu sebelum menyimpan."
                        : "Sebagian jawaban belum bisa disimpan. Coba beberapa saat lagi."
                };
            }
        }

        return {
            ok: true,
            results,
            message: "Jawaban kelompok berhasil disimpan."
        };
    }

    async function loadMultipleLearningResponses(items) {
        let loadedCount = 0;
        const results = [];

        for (const item of items) {
            const result = await loadLearningResponse(item.activityKey, item.questionKey);
            results.push({ ...result, item });

            if (result.ok) {
                loadedCount++;
                if (typeof item.applyValue === "function") {
                    item.applyValue(result.response);
                } else if (item.fieldSelector) {
                    applyLoadedResponseToField(item.fieldSelector, result.response);
                }
            }
        }

        if (!loadedCount) {
            return {
                ok: false,
                loadedCount,
                results,
                message: "Belum ada jawaban kelompok yang tersimpan."
            };
        }

        const partial = loadedCount < items.length;
        return {
            ok: true,
            loadedCount,
            results,
            message: partial
                ? "Sebagian jawaban kelompok terbaru berhasil dimuat."
                : "Jawaban kelompok terbaru berhasil dimuat."
        };
    }

    function showBatchResponseStatus(container, message, type = "info") {
        showResponseStatus(container, message, type);
    }

    function prepareLearningResponseSession({ storageKeys = [], sessionKey = "learningResponsesSessionUserId" } = {}) {
        const currentUserId = localStorage.getItem("userId") || "";
        const previousUserId = localStorage.getItem(sessionKey) || "";
        const userChanged = Boolean(currentUserId && previousUserId && currentUserId !== previousUserId);

        if (userChanged) {
            storageKeys.forEach((key) => localStorage.removeItem(key));
        }

        if (currentUserId) {
            localStorage.setItem(sessionKey, currentUserId);
        }

        return userChanged;
    }

    function createBatchControls(config) {
        const wrapper = document.createElement("div");
        wrapper.className = "learning-response-tools learning-response-tools-batch";
        wrapper.dataset.learningResponseBatch = config.activityKey || "activity";

        const info = document.createElement("p");
        info.className = "learning-response-info";
        info.textContent = config.infoText || "Jawaban ini digunakan bersama oleh anggota kelompokmu.";

        const actions = document.createElement("div");
        actions.className = "learning-response-actions";

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = config.buttonClass || "button learning-response-btn";
        saveButton.textContent = "Simpan Jawaban Kelompok";

        const loadButton = document.createElement("button");
        loadButton.type = "button";
        loadButton.className = config.secondaryButtonClass || "button learning-response-btn secondary";
        loadButton.textContent = "Muat Jawaban Terbaru";

        const status = document.createElement("p");
        status.className = "learning-response-status validation-message";
        status.hidden = true;

        actions.append(saveButton, loadButton);
        wrapper.append(info, actions, status);

        saveButton.addEventListener("click", async () => {
            saveButton.disabled = true;
            const result = await saveMultipleLearningResponses(config.items || []);
            showBatchResponseStatus(status, result.message, result.ok ? "success" : "error");
            saveButton.disabled = false;
        });

        loadButton.addEventListener("click", async () => {
            loadButton.disabled = true;
            const result = await loadMultipleLearningResponses(config.items || []);
            showBatchResponseStatus(status, result.message, result.ok ? "success" : "info");
            loadButton.disabled = false;
        });

        return wrapper;
    }

    async function attachLearningResponseControls(config) {
        const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
        if (!mount || mount.dataset.learningResponseAttached === "true") return null;

        const identity = await getResponseIdentity();
        const scope = getResponseScope(identity);
        if (scope !== "kelompok") return null;
        const controls = createControls(config, identity, scope);
        mount.insertAdjacentElement(config.position || "afterend", controls);
        mount.dataset.learningResponseAttached = "true";
        return controls;
    }

    async function attachLearningResponseBatchControls(config) {
        const mount = typeof config.mount === "string" ? document.querySelector(config.mount) : config.mount;
        if (!mount || mount.dataset.learningResponseBatchAttached === "true") return null;

        const identity = await getResponseIdentity();
        const scope = getResponseScope(identity);
        if (scope !== "kelompok") return null;

        const controls = createBatchControls(config);
        mount.insertAdjacentElement(config.position || "afterend", controls);
        mount.dataset.learningResponseBatchAttached = "true";
        return controls;
    }

    window.LearningResponses = {
        getResponseIdentity,
        getResponseScope,
        buildResponseQuery,
        saveLearningResponse,
        loadLearningResponse,
        saveMultipleLearningResponses,
        loadMultipleLearningResponses,
        prepareLearningResponseSession,
        applyLoadedResponseToField,
        showResponseStatus,
        showBatchResponseStatus,
        attachLearningResponseControls,
        attachLearningResponseBatchControls
    };
})();
