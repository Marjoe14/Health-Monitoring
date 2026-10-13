// ========================================
// BHW HEADER SEARCH - Global Resident Search
// ✅ Fallback to phpResidents if window.residents is empty
// ========================================

(function () {
    'use strict';

    let searchInput = null;
    let searchResultsDropdown = null;
    let highlightedIndex = -1;
    let currentResults = [];

    // ========================================
    // GET RESIDENTS (with fallback)
    // ========================================
    function getResidentsForSearch() {
        // Priority 1: window.residents (from bhw-init.js state)
        if (typeof window.residents !== 'undefined' && Array.isArray(window.residents) && window.residents.length > 0) {
            return window.residents;
        }

        // Priority 2: phpResidents (from bhw.php script tag)
        if (typeof window.phpResidents !== 'undefined' && Array.isArray(window.phpResidents) && window.phpResidents.length > 0) {
            // Convert PHP format to JS format
            return window.phpResidents.map(function (r) {
                return {
                    id: r.id,
                    fullName: (r.first_name || '') + ' ' + (r.middle_name ? r.middle_name + ' ' : '') + (r.last_name || ''),
                    age_display: r.age_display || r.age_years || '—',
                    age: r.age_years || '—',
                    purok: r.purok || '—',
                    mobile: r.mobile || '—',
                    sex: r.sex || '—',
                    type: r.type || 'Unknown',
                    account_status: r.account_status || 'No Account',
                    pregnancy_status: r.pregnancy_status || 'Not Pregnant'
                };
            });
        }

        return [];
    }

    // ========================================
    // INIT
    // ========================================
    function initHeaderSearch() {
        searchInput = document.getElementById('globalSearch');
        if (!searchInput) return;

        ensureWrapper();
        createResultsDropdown();

        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('focus', handleFocus);
        searchInput.addEventListener('keydown', handleKeydown);

        document.addEventListener('click', function (e) {
            if (!searchInput.contains(e.target) && searchResultsDropdown && !searchResultsDropdown.contains(e.target)) {
                closeDropdown();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeDropdown();
        });

        console.log('🔍 Header search initialized');
    }

    // ========================================
    // ENSURE WRAPPER (relative positioning)
    // ========================================
    function ensureWrapper() {
        let parent = searchInput.parentElement;
        if (!parent) return;
        parent.style.position = 'relative';
    }

    // ========================================
    // CREATE DROPDOWN ELEMENT
    // ========================================
    function createResultsDropdown() {
        const existing = document.getElementById('headerSearchResults');
        if (existing) existing.remove();

        searchResultsDropdown = document.createElement('div');
        searchResultsDropdown.id = 'headerSearchResults';
        searchResultsDropdown.style.cssText = `
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 340px;
            max-width: 450px;
            max-height: 400px;
            overflow-y: auto;
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(74, 144, 217, 0.18);
            border: 1px solid #E8EEF4;
            z-index: 9999;
            display: none;
            font-family: var(--font, 'Inter', sans-serif);
        `;

        searchInput.parentElement.appendChild(searchResultsDropdown);
    }

    // ========================================
    // HANDLE INPUT (live search)
    // ========================================
    function handleInput() {
        const query = searchInput.value.trim().toLowerCase();

        if (!query) {
            closeDropdown();
            return;
        }

        const residents = getResidentsForSearch();

        // Debug log
        console.log('🔍 Searching for:', query, '| Available residents:', residents.length);

        const results = residents.filter(function (r) {
            const name = (r.fullName || '').toLowerCase();
            const purok = (r.purok || '').toLowerCase();
            const mobile = (r.mobile || '').toLowerCase();
            const ageStr = String(r.age_display || r.age || '').toLowerCase();

            return name.includes(query) ||
                   purok.includes(query) ||
                   mobile.includes(query) ||
                   ageStr.includes(query);
        }).slice(0, 10);

        currentResults = results;
        highlightedIndex = -1;

        if (results.length === 0) {
            showNoResults(query, residents.length);
            return;
        }

        renderResults(results, query);
    }

    // ========================================
    // RENDER RESULTS
    // ========================================
    function renderResults(results, query) {
        if (!searchResultsDropdown) return;

        let html = `
            <div style="padding: 10px 16px; background: #F5FAFF; border-bottom: 1px solid #E8EEF4; font-size: 0.75rem; color: #5A6C7D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${results.length} match${results.length > 1 ? 'es' : ''} found
            </div>
        `;

        results.forEach(function (r, index) {
            const accountBadge = r.account_status === 'Has Account'
                ? '<span style="background:#E8F5E9; color:#2E7D32; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">Has Account</span>'
                : '<span style="background:#EEEEEE; color:#757575; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">No Account</span>';

            const typeBadge = r.type === 'Child'
                ? '<span style="background:#E3F2FD; color:#1565C0; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">Child</span>'
                : (r.type === 'Elderly'
                    ? '<span style="background:#FFF3E0; color:#E65100; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">Elderly</span>'
                    : '<span style="background:#E8F5E9; color:#2E7D32; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">Adult</span>');

            const pregBadge = (r.sex === 'Female' && r.pregnancy_status === 'Pregnant')
                ? '<span style="background:#FCE4EC; color:#C2185B; padding:1px 8px; border-radius:50px; font-size:0.65rem; font-weight:600;">Pregnant</span>'
                : '';

            html += `
                <div class="header-search-result"
                     data-resident-id="${r.id}"
                     data-index="${index}"
                     style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #F0F4F8; transition: background 0.2s; display: flex; align-items: center; gap: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #4A90D9 0%, #3A7BC8 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">
                        ${getInitials(r.fullName)}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; color: #1A2A3A; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${highlightMatch(r.fullName, query)}
                        </div>
                        <div style="font-size: 0.75rem; color: #5A6C7D; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                            <span>${r.age_display || r.age || '—'}</span>
                            <span>·</span>
                            <span>${r.purok || '—'}</span>
                            ${pregBadge}
                            ${typeBadge}
                            ${accountBadge}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #A0B4C5; font-size: 0.75rem;"></i>
                </div>
            `;
        });

        html += `
            <div style="padding: 10px 16px; background: #F5FAFF; border-top: 1px solid #E8EEF4; text-align: center; font-size: 0.75rem; color: #5A6C7D;">
                <i class="fas fa-info-circle"></i> Press <strong>Enter</strong> to see all results in Residents page
            </div>
        `;

        searchResultsDropdown.innerHTML = html;
        searchResultsDropdown.style.display = 'block';

        searchResultsDropdown.querySelectorAll('.header-search-result').forEach(function (el) {
            el.addEventListener('click', function () {
                const residentId = parseInt(this.dataset.residentId);
                selectResident(residentId);
            });

            el.addEventListener('mouseenter', function () {
                highlightedIndex = parseInt(this.dataset.index);
                updateHighlight();
            });
        });
    }

    // ========================================
    // SHOW NO RESULTS
    // ========================================
    function showNoResults(query, totalResidents) {
        if (!searchResultsDropdown) return;

        const totalDisplay = typeof totalResidents === 'number' ? totalResidents : 0;

        searchResultsDropdown.innerHTML = `
            <div style="padding: 30px 20px; text-align: center;">
                <i class="fas fa-search" style="font-size: 2rem; color: #D0DCE8; margin-bottom: 10px;"></i>
                <p style="font-size: 0.9rem; color: #5A6C7D; margin-bottom: 4px;">No residents found</p>
                <p style="font-size: 0.75rem; color: #A0B4C5;">No matches for "${escapeHtml(query)}"</p>
                <p style="font-size: 0.7rem; color: #D0DCE8; margin-top: 8px;">Total residents loaded: ${totalDisplay}</p>
            </div>
        `;
        searchResultsDropdown.style.display = 'block';
    }

    // ========================================
    // HIGHLIGHT MATCHED TEXT
    // ========================================
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const regex = new RegExp('(' + escapeRegex(escapeHtml(query)) + ')', 'gi');
        return escaped.replace(regex, '<mark style="background: #FFF9C4; color: #1A2A3A; padding: 0 2px; border-radius: 2px;">$1</mark>');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ========================================
    // GET INITIALS
    // ========================================
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // ========================================
    // UPDATE HIGHLIGHT
    // ========================================
    function updateHighlight() {
        searchResultsDropdown.querySelectorAll('.header-search-result').forEach(function (el) {
            const idx = parseInt(el.dataset.index);
            if (idx === highlightedIndex) {
                el.style.background = '#EBF3FB';
            } else {
                el.style.background = '';
            }
        });
    }

    // ========================================
    // KEYBOARD NAVIGATION
    // ========================================
    function handleKeydown(e) {
        if (searchResultsDropdown.style.display === 'none') {
            if (e.key === 'Enter') {
                e.preventDefault();
                goToResidentsPage();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, currentResults.length - 1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, -1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && currentResults[highlightedIndex]) {
                selectResident(currentResults[highlightedIndex].id);
            } else {
                goToResidentsPage();
            }
        }
    }

    function scrollToHighlighted() {
        const el = searchResultsDropdown.querySelector('.header-search-result[data-index="' + highlightedIndex + '"]');
        if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // ========================================
    // SELECT RESIDENT — Open View Modal
    // ========================================
    function selectResident(residentId) {
        closeDropdown();

        if (typeof window.navigateTo === 'function') {
            window.navigateTo('residents');
        }

        setTimeout(function () {
            if (typeof window.viewResidentDetail === 'function') {
                window.viewResidentDetail(residentId);
            }
        }, 300);
    }

    // ========================================
    // GO TO RESIDENTS PAGE
    // ========================================
    function goToResidentsPage() {
        const query = searchInput.value.trim();

        closeDropdown();

        if (typeof window.navigateTo === 'function') {
            window.navigateTo('residents');
        }

        setTimeout(function () {
            const residentSearch = document.getElementById('residentSearch');
            if (residentSearch) {
                residentSearch.value = query;
                residentSearch.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, 300);
    }

    // ========================================
    // CLOSE DROPDOWN
    // ========================================
    function closeDropdown() {
        if (searchResultsDropdown) {
            searchResultsDropdown.style.display = 'none';
        }
        highlightedIndex = -1;
    }

    function handleFocus() {
        if (searchInput.value.trim()) {
            handleInput();
        }
    }

    // ========================================
    // BOOTSTRAP
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderSearch);
    } else {
        initHeaderSearch();
    }

    // Expose refresh for external use
    window.refreshHeaderSearch = function () {
        if (searchInput && searchInput.value.trim()) {
            handleInput();
        }
    };

})();