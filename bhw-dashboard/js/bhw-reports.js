// ========================================
// BHW REPORT GENERATION - Optimized Module
// ✅ Handles: Generate, Print, Export PDF
// ✅ Works for ALL report types (resident, prenatal, immunization, bmi, opt, monthly)
// ========================================

(function () {
    'use strict';

    // ========================================
    // STATE
    // ========================================
    let currentReportHTML = '';
    let currentReportTitle = '';

    // Report type display names
    const REPORT_NAMES = {
        'resident':     'Resident Statistics Report',
        'prenatal':     'Prenatal Care Report',
        'immunization': 'Immunization Report',
        'bmi':          'BMI Assessment Report',
        'opt':          'Operation Timbang (OPT) Report',
        'monthly':      'Monthly Health Report'
    };

    // ========================================
    // DOM HELPERS
    // ========================================
    function getPreviewElements() {
        return {
            preview:        document.getElementById('reportPreview'),
            previewTitle:   document.getElementById('reportPreviewTitle'),
            previewContent: document.querySelector('.report-preview-content'),
            closeBtn:       document.getElementById('closePreview')
        };
    }

    // ========================================
    // SHOW LOADING STATE
    // ========================================
    function showPreviewLoading(title) {
        const { preview, previewTitle, previewContent } = getPreviewElements();

        if (preview) {
            preview.style.display = 'block';
            preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (previewTitle) {
            previewTitle.textContent = 'Generating ' + title + '...';
        }

        if (previewContent) {
            previewContent.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
                    <p>Generating report...</p>
                    <span class="empty-sub">Please wait while we compile the data.</span>
                </div>
            `;
        }
    }

    // ========================================
    // SHOW ERROR STATE
    // ========================================
    function showPreviewError(message) {
        const { previewContent } = getPreviewElements();

        if (previewContent) {
            previewContent.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; color: var(--danger);"></i>
                    <p>${escapeHtml(message || 'Failed to generate report.')}</p>
                    <span class="empty-sub">Please try again or contact support.</span>
                </div>
            `;
        }
    }

    // ========================================
    // ESCAPE HTML
    // ========================================
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
    // TOAST HELPER (fallback if global not found)
    // ========================================
    function toast(message, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        console.log('[' + (type || 'info') + '] ' + message);
    }

    // ========================================
    // UPDATE PREVIEW ACTIONS
    // ✅ Re-binds Print, PDF, and hides Download for every report
    // ========================================
    function updatePreviewActions() {
        const actions = document.querySelector('.report-preview-actions');
        if (!actions) return;

        const buttons = actions.querySelectorAll('button');

        // Button 0: Print
        if (buttons[0]) {
            buttons[0].innerHTML = '<i class="fas fa-print"></i> Print';
            buttons[0].onclick = function (e) {
                e.preventDefault();
                printReport();
            };
        }

        // Button 1: Export PDF
        if (buttons[1]) {
            buttons[1].innerHTML = '<i class="fas fa-file-pdf"></i> Export PDF';
            buttons[1].onclick = function (e) {
                e.preventDefault();
                exportToPDF();
            };
        }

        // Button 2: Download — hide (redundant with PDF export)
        if (buttons[2]) {
            buttons[2].style.display = 'none';
        }
    }

    // ========================================
    // HANDLE REPORT GENERATION
    // ✅ Same function for all report types
    // ========================================
    function handleReportGeneration(e) {
        if (e) e.preventDefault();

        const reportType = this.dataset.report;
        const title = REPORT_NAMES[reportType] || 'Report';

        showPreviewLoading(title);

        const formData = new FormData();
        formData.append('action', 'generate_report');
        formData.append('report_type', reportType);

        fetch('ajax/bhw_report_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok (' + response.status + ')');
                }
                return response.json();
            })
            .then(function (data) {
                const { previewTitle, previewContent } = getPreviewElements();

                if (data.success) {
                    if (previewTitle) {
                        previewTitle.textContent = data.title || title;
                    }

                    if (previewContent) {
                        previewContent.innerHTML = data.html;

                        // Store for print / PDF
                        currentReportHTML = data.html;
                        currentReportTitle = data.title || title;

                        // ✅ Re-bind Print + PDF buttons
                        updatePreviewActions();
                    }

                    toast('Report generated successfully!', 'success');
                } else {
                    toast(data.message || 'Failed to generate report.', 'error');
                    showPreviewError(data.message);
                }
            })
            .catch(function (error) {
                console.error('Report generation error:', error);
                toast('Network error. Please try again.', 'error');
                showPreviewError('Network error occurred. Please check your connection.');
            });
    }

    // ========================================
    // SHARED PRINT/PDF STYLES
    // ✅ Used by both print and PDF export
    // ========================================
    function getReportStyles() {
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                padding: 40px;
                color: #1A2A3A;
                line-height: 1.6;
                max-width: 1100px;
                margin: 0 auto;
                background: #fff;
            }
            .report-print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #4A90D9;
                padding-bottom: 20px;
            }
            .report-print-header h1 { font-size: 24px; color: #1A2A3A; font-weight: 700; margin: 4px 0; }
            .report-print-header .barangay-name { font-size: 16px; color: #4A90D9; font-weight: 600; }
            .report-print-header .report-date { font-size: 12px; color: #5A6C7D; margin-top: 4px; }
            .report-print-footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #E8EEF4;
                font-size: 12px;
                color: #5A6C7D;
            }
            .report-content { padding: 10px 0; }
            .report-content h2 { font-size: 20px; font-weight: 700; color: #1A2A3A; margin-bottom: 4px; }
            .report-content h3 { font-size: 16px; font-weight: 600; color: #1A2A3A; margin: 20px 0 12px 0; }
            .report-content hr { border: none; border-top: 2px solid #E8EEF4; margin: 12px 0 20px 0; }
            .report-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }
            .report-stat {
                background: #F5FAFF;
                padding: 14px 16px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #E8EEF4;
            }
            .report-stat strong { display: block; font-size: 11px; color: #5A6C7D; text-transform: uppercase; letter-spacing: 0.5px; }
            .report-stat .stat-number { font-size: 24px; font-weight: 700; color: #1A2A3A; }
            .report-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                margin: 8px 0 16px 0;
            }
            .report-table th {
                background: #EBF3FB;
                text-align: left;
                padding: 8px 12px;
                font-weight: 600;
                color: #1A2A3A;
                border-bottom: 2px solid #90CAF9;
            }
            .report-table td {
                padding: 6px 12px;
                border-bottom: 1px solid #E8EEF4;
            }
            .report-table tr:nth-child(even) td { background: #FAFCFE; }
            .status-badge {
                display: inline-block;
                padding: 2px 12px;
                border-radius: 50px;
                font-size: 11px;
                font-weight: 600;
            }
            .status-badge.status-completed,
            .status-badge.completed { background: #E8F5E9; color: #2E7D32; }
            .status-badge.status-upcoming,
            .status-badge.upcoming { background: #FFF3E0; color: #E65100; }
            .status-badge.status-overdue,
            .status-badge.overdue { background: #FDEDEC; color: #C62828; }
            .status-badge.status-active,
            .status-badge.active { background: #EBF3FB; color: #4A90D9; }
            .status-badge.status-inactive,
            .status-badge.inactive { background: #EEEEEE; color: #757575; }
            .status-badge.status-normal,
            .status-badge.normal { background: #E8F5E9; color: #2E7D32; }
            .status-badge.status-underweight,
            .status-badge.underweight { background: #FFF3E0; color: #E65100; }
            .status-badge.status-overweight,
            .status-badge.overweight { background: #FFF3E0; color: #E65100; }
            .status-badge.status-obese,
            .status-badge.obese { background: #FDEDEC; color: #C62828; }
            .status-badge.status-severely-underweight,
            .status-badge.severely-underweight { background: #FDEDEC; color: #C62828; }
            .status-badge.status-sent,
            .status-badge.sent { background: #E8F5E9; color: #2E7D32; }
            .status-badge.status-failed,
            .status-badge.failed { background: #FDEDEC; color: #C62828; }
            .status-badge.status-pending,
            .status-badge.pending { background: #FFF3E0; color: #E65100; }
            .status-badge.status-cancelled,
            .status-badge.cancelled { background: #EEEEEE; color: #757575; }
            .status-badge.status-delivered,
            .status-badge.delivered { background: #E8F5E9; color: #2E7D32; }
            .status-badge.status-transferred,
            .status-badge.transferred { background: #E3F2FD; color: #1565C0; }
            @media print {
                body { padding: 20px; }
                .report-print-header { margin-bottom: 20px; padding-bottom: 15px; }
                .report-print-header h1 { font-size: 20px; }
                .report-stats-grid { break-inside: avoid; }
                .report-table { font-size: 11px; }
                .report-table th, .report-table td { padding: 4px 8px; }
            }
        `;
    }

    // ========================================
    // BUILD HEADER + FOOTER
    // ========================================
    function getHeaderHtml(dateStr) {
        return `
            <div class="report-print-header">
                <div class="barangay-name">Barangay Garsika</div>
                <h1>${escapeHtml(currentReportTitle || 'Health Report')}</h1>
                <div class="report-date">Generated: ${dateStr}</div>
            </div>
        `;
    }

    function getFooterHtml(dateStr) {
        return `
            <div class="report-print-footer">
                <p>Barangay Garsika · Smart Community Health Monitoring System</p>
                <p>Generated on ${dateStr}</p>
            </div>
        `;
    }

    // ========================================
    // PRINT REPORT — WORKS FOR ALL TYPES
    // ========================================
    function printReport() {
        const { previewContent } = getPreviewElements();

        if (!previewContent || !previewContent.innerHTML.trim()) {
            toast('No report content to print.', 'error');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            toast('Please allow popups for printing.', 'error');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(currentReportTitle || 'Health Report')}</title>
                <style>${getReportStyles()}</style>
            </head>
            <body>
                ${getHeaderHtml(dateStr)}
                <div class="report-content">${previewContent.innerHTML}</div>
                ${getFooterHtml(dateStr)}
                <script>
                    window.onload = function () {
                        setTimeout(function () {
                            window.print();
                        }, 100);
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    // ========================================
    // EXPORT TO PDF — WORKS FOR ALL TYPES
    // ========================================
    function exportToPDF() {
        const { previewContent } = getPreviewElements();

        if (!previewContent || !previewContent.innerHTML.trim()) {
            toast('No report content to export.', 'error');
            return;
        }

        toast('Generating PDF...', 'info');

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const safeTitle = (currentReportTitle || 'report')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        const filename = safeTitle + '_' + now.toISOString().slice(0, 10) + '.pdf';

        const pdfWindow = window.open('', '_blank', 'width=800,height=600');
        if (!pdfWindow) {
            toast('Please allow popups for PDF export.', 'error');
            return;
        }

        pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${escapeHtml(currentReportTitle || 'Health Report')}</title>
                <style>${getReportStyles()}</style>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
            </head>
            <body>
                <div id="report-content-wrapper">
                    ${getHeaderHtml(dateStr)}
                    <div class="report-content">${previewContent.innerHTML}</div>
                    ${getFooterHtml(dateStr)}
                </div>

                <script>
                    window.onload = function () {
                        var element = document.getElementById('report-content-wrapper');
                        var opt = {
                            margin:       [10, 10, 10, 10],
                            filename:     '${filename}',
                            image:        { type: 'jpeg', quality: 0.98 },
                            html2canvas:  { scale: 2, letterRendering: true, useCORS: true, logging: false },
                            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };
                        html2pdf().set(opt).from(element).save().then(function () {
                            setTimeout(function () { window.close(); }, 500);
                        }).catch(function (err) {
                            console.error('PDF error:', err);
                            setTimeout(function () { window.close(); }, 500);
                        });
                    };
                <\/script>
            </body>
            </html>
        `);

        pdfWindow.document.close();
    }

    // ========================================
    // CLOSE PREVIEW
    // ========================================
    function closeReportPreview() {
        const { preview, previewContent } = getPreviewElements();

        if (preview) {
            preview.style.display = 'none';
        }

        if (previewContent) {
            previewContent.innerHTML = `
                <div class="report-placeholder">
                    <i class="fas fa-file-alt"></i>
                    <p>Report content will appear here.</p>
                    <span class="empty-sub">Click a report button above to generate.</span>
                </div>
            `;
        }

        currentReportHTML = '';
        currentReportTitle = '';
    }

    // ========================================
    // ATTACH EVENT LISTENERS
    // ========================================
    function attachReportButtonListeners() {
        document.querySelectorAll('.generate-report').forEach(function (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', handleReportGeneration);
        });
    }

    function attachClosePreviewListener() {
        const { closeBtn } = getPreviewElements();
        if (!closeBtn) return;

        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', closeReportPreview);
    }

    // ========================================
    // INIT
    // ========================================
    function init() {
        attachReportButtonListeners();
        attachClosePreviewListener();
        console.log('📊 BHW Report system initialized — Print & PDF work for ALL report types!');
    }

    // ========================================
    // BOOTSTRAP
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external use
    window.BHWReports = {
        init: init,
        print: printReport,
        exportPDF: exportToPDF,
        closePreview: closeReportPreview,
        regenerateButtons: attachReportButtonListeners
    };

})();