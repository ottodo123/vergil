// Function to copy list to clipboard
function copyList(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('No words to copy in this list.');
        return;
    }

    // Format the text to copy
    let copyText = `${listName} - Vergil Glossary\n\n`;

    words.forEach(word => {
        const isRequired = word.Required === 1 || word.Required === "1";
        copyText += `${isRequired ? '★ ' : ''}${word.Headword}: ${word.Definitions}\n`;
        copyText += `(Occurrences: ${word["Occurrences in the Aeneid"]})\n\n`;
    });

    // Copy to clipboard
    navigator.clipboard.writeText(copyText)
        .then(() => {
            // Show success message
            const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
            const copyBtn = listContent.querySelector('.copy-btn');

            // Change button text temporarily
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';

            // Reset button text after 2 seconds
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy to clipboard. Please try again.');
        });
}

// Function to generate and download a PDF
function printList(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('No words to print in this list.');
        return;
    }

    // Show loading indicator
    const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
    const printBtn = listContent.querySelector('.print-btn');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = '<span class="btn-icon">⏳</span> Preparing PDF...';

    // Debug the jsPDF library availability - log more details
    console.log("jsPDF availability check:",
                "window.jspdf =", typeof window.jspdf,
                "jsPDF direct =", typeof jsPDF);

    // Try to load jsPDF synchronously first
    try {
        generatePDF(listName, words, printBtn, originalText);
    } catch (error) {
        console.error("Error in initial PDF generation attempt:", error);

        // If failed, try loading the library again
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

        script.onload = function() {
            console.log("jsPDF loaded via script tag, retrying...");
            try {
                generatePDF(listName, words, printBtn, originalText);
            } catch (retryError) {
                console.error("Error in retry PDF generation:", retryError);
                alert("Failed to generate PDF. Please try again or refresh the page.");
                printBtn.innerHTML = originalText;
            }
        };

        script.onerror = function(e) {
            console.error("Failed to load jsPDF script:", e);
            alert("Failed to load PDF generation library. Please try again later or check your internet connection.");
            printBtn.innerHTML = originalText;
        };

        document.head.appendChild(script);
    }
}

// Helper function to generate PDF
function generatePDF(listName, words, printBtn, originalBtnText) {
    try {
        // Check what's available in the global scope
        console.log("jsPDF availability check:",
                   "window.jspdf =", typeof window.jspdf,
                   "window.jspdf.jsPDF =", window.jspdf ? typeof window.jspdf.jsPDF : "N/A",
                   "jsPDF direct =", typeof jsPDF);

        let doc;

        // Try different ways to access jsPDF
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function') {
            // Use window.jspdf.jsPDF if available (our preferred setup)
            const { jsPDF } = window.jspdf;
            doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else if (typeof jsPDF === 'function') {
            // Direct global jsPDF
            doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else if (typeof window.jsPDF === 'function') {
            // Try window.jsPDF
            doc = new window.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else {
            throw new Error("jsPDF not found in any expected location. Make sure it's properly loaded.");
        }

        console.log("PDF document created successfully");

        // Set font sizes
        const titleFontSize = 16;
        const wordFontSize = 11;
        const defFontSize = 10;

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Use 1-inch margins (25.4mm = 1 inch)
        const margin = {
            left: 25.4,   // 1 inch
            right: 25.4,  // 1 inch
            top: 25.4,    // 1 inch
            bottom: 25.4  // 1 inch
        };

        // Title
        doc.setFontSize(titleFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(`${listName} - Vergil Glossary`, margin.left, margin.top);

        // Word count
        doc.setFontSize(defFontSize);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total words: ${words.length}`, margin.left, margin.top + 7);

        // Date
        const today = new Date();
        const dateStr = today.toLocaleDateString();
        doc.text(`Generated: ${dateStr}`, pageWidth - margin.right - 40, margin.top + 7);

        // Draw a line
        doc.setLineWidth(0.3);
        doc.line(margin.left, margin.top + 10, pageWidth - margin.right, margin.top + 10);

        // Start position for words
        let y = margin.top + 20;
        let currentPage = 1;

        // Text processing helpers
        function cleanDefinition(text) {
            // Remove any problematic characters or sequences
            if (!text) return "";
            return text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
        }

        // Process each word
        words.forEach((word, index) => {
            const isRequired = word.Required === 1 || word.Required === "1";

            // Use Headword_Data instead of Headword
            const headwordText = word.Headword_Data || word.Headword;
            const headword = isRequired ? `★ ${headwordText}` : headwordText;

            // Clean definition text
            const definition = cleanDefinition(word.Definitions);

            // Calculate available width for text with exact 1-inch margins
            const textWidth = pageWidth - margin.left - margin.right;

            // Split definition into multiple lines with proper width constraint
            const definitionLines = doc.splitTextToSize(definition, textWidth);

            // Calculate total height needed for this entry (without occurrences line)
            const lineHeight = 5;
            const definitionHeight = definitionLines.length * lineHeight;
            const estimatedHeight = 10 + definitionHeight + 5; // Reduced since we removed occurrences

            // Check if we need a new page - leave adequate space at bottom margin
            if (y + estimatedHeight > pageHeight - margin.bottom) {
                doc.addPage();
                currentPage++;

                // Reset position for new page
                y = margin.top + 10;

                // Add header to new page
                doc.setFontSize(defFontSize);
                doc.setFont('helvetica', 'italic');
                doc.text(`${listName} (continued) - Page ${currentPage}`, margin.left, margin.top);
                doc.line(margin.left, margin.top + 3, pageWidth - margin.right, margin.top + 3);
                y += 10;
            }

            // Headword
            doc.setFontSize(wordFontSize);
            doc.setFont('helvetica', 'bold');
            doc.text(headword, margin.left, y);

            // Definition
            doc.setFontSize(defFontSize);
            doc.setFont('helvetica', 'normal');
            doc.text(definitionLines, margin.left, y + 5);

            // Update y position for next word
            y += 5 + definitionHeight + 10;

            // Add a separator line between words (except the last one)
            if (index < words.length - 1) {
                doc.setDrawColor(200, 200, 200); // Light gray
                doc.setLineWidth(0.1);
                doc.line(margin.left, y - 5, pageWidth - margin.right, y - 5);
            }
        });

        // Save the PDF with a proper name
        const filename = `${listName.replace(/\s+/g, '_')}_vergil_glossary.pdf`;
        doc.save(filename);

        // Reset button text
        printBtn.innerHTML = '<span class="btn-icon">✓</span> PDF Downloaded!';

        // Reset button text after 2 seconds
        setTimeout(() => {
            printBtn.innerHTML = originalBtnText;
        }, 2000);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF: " + error.message);
        printBtn.innerHTML = originalBtnText;
    }
}

// Add this to the document load event to make sure jsPDF is available
document.addEventListener('DOMContentLoaded', function() {
    // Load jsPDF library at startup - FIXED: Check for window.jspdf not jsPDF
    if (typeof window.jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
    }
});
