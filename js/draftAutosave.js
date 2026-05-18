(function () {
    const DEFAULT_DEBOUNCE_MS = 500;

    function getDraftUserId() {
        return localStorage.getItem("userId") || "anon";
    }

    function safeKeyPart(value) {
        return String(value || "")
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "_") || "anon";
    }

    function getDraftKey(activityKey) {
        return `draft_${safeKeyPart(getDraftUserId())}_${safeKeyPart(activityKey)}`;
    }

    function saveDraft(activityKey, data) {
        localStorage.setItem(getDraftKey(activityKey), JSON.stringify({
            data,
            updatedAt: new Date().toISOString()
        }));
    }

    function loadDraft(activityKey) {
        try {
            const raw = localStorage.getItem(getDraftKey(activityKey));
            if (!raw) return null;
            return JSON.parse(raw).data || null;
        } catch (error) {
            console.warn("Draft belum bisa dibaca.", error);
            return null;
        }
    }

    function clearDraft(activityKey) {
        localStorage.removeItem(getDraftKey(activityKey));
    }

    function debounce(fn, wait = DEFAULT_DEBOUNCE_MS) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function getFieldValue(fieldConfig) {
        if (fieldConfig.type === "radio") {
            return document.querySelector(`input[name="${fieldConfig.name}"]:checked`)?.value || "";
        }

        const field = document.querySelector(fieldConfig.selector);
        return field ? field.value : "";
    }

    function setFieldValue(fieldConfig, value) {
        if (fieldConfig.type === "radio") {
            if (!value) return;
            const field = document.querySelector(`input[name="${fieldConfig.name}"][value="${value}"]`);
            if (field) {
                field.checked = true;
                field.dispatchEvent(new Event("change", { bubbles: true }));
            }
            return;
        }

        const field = document.querySelector(fieldConfig.selector);
        if (field) {
            field.value = value || "";
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function collectFields(fieldsConfig) {
        return fieldsConfig.reduce((draft, fieldConfig) => {
            draft[fieldConfig.key] = getFieldValue(fieldConfig);
            return draft;
        }, {});
    }

    function restoreFields(fieldsConfig, draft) {
        fieldsConfig.forEach((fieldConfig) => {
            if (Object.prototype.hasOwnProperty.call(draft, fieldConfig.key)) {
                setFieldValue(fieldConfig, draft[fieldConfig.key]);
            }
        });
    }

    function showDraftStatus(mount, message) {
        const target = typeof mount === "string" ? document.querySelector(mount) : mount;
        if (!target) return;

        let status = target.parentElement?.querySelector(".draft-autosave-status");
        if (!status) {
            status = document.createElement("p");
            status.className = "draft-autosave-status validation-message is-neutral";
            target.insertAdjacentElement("afterend", status);
        }
        status.textContent = message;
        status.hidden = false;
    }

    function attachDraftAutosave(activityKey, options = {}) {
        const fields = options.fields || [];
        const shouldSkip = typeof options.shouldSkip === "function" ? options.shouldSkip : () => false;
        const collect = typeof options.collect === "function" ? options.collect : () => collectFields(fields);
        const restore = typeof options.restore === "function" ? options.restore : (draft) => restoreFields(fields, draft);
        const saveNow = () => {
            if (shouldSkip()) return;
            saveDraft(activityKey, collect());
        };
        const debouncedSave = debounce(saveNow, options.debounceMs || DEFAULT_DEBOUNCE_MS);

        fields.forEach((fieldConfig) => {
            if (fieldConfig.type === "radio") {
                document.querySelectorAll(`input[name="${fieldConfig.name}"]`).forEach((field) => {
                    field.addEventListener("change", debouncedSave);
                });
                return;
            }

            const field = document.querySelector(fieldConfig.selector);
            if (field) {
                field.addEventListener("input", debouncedSave);
                field.addEventListener("change", debouncedSave);
            }
        });

        (options.extraSelectors || []).forEach((selector) => {
            const target = document.querySelector(selector);
            if (target) {
                target.addEventListener("input", debouncedSave);
                target.addEventListener("change", debouncedSave);
            }
        });

        const draft = loadDraft(activityKey);
        if (draft && !shouldSkip()) {
            restore(draft);
            if (options.statusMount) {
                showDraftStatus(options.statusMount, "Draft jawaban sebelumnya berhasil dipulihkan.");
            }
            if (typeof options.onRestore === "function") {
                options.onRestore(draft);
            }
        }

        return {
            saveNow,
            clear: () => clearDraft(activityKey)
        };
    }

    window.DraftAutosave = {
        getDraftUserId,
        getDraftKey,
        saveDraft,
        loadDraft,
        clearDraft,
        attachDraftAutosave
    };
})();
