import { jsPDF } from "jspdf"
import { marathiFontBase64 } from "./marathiFontBase64"

export const registerFonts = (doc: jsPDF) => {
    try {
        const cleanBase64 = marathiFontBase64;
        const fileName = "NotoSansDevanagari-Regular.ttf";
        const fontName = "NotoMarathi";

        doc.addFileToVFS(fileName, cleanBase64);
        doc.addFont(fileName, fontName, "normal");
        doc.addFont(fileName, fontName, "bold");

        doc.setFont(fontName);
        console.log("Marathi font registered successfully from embedded constant");
    } catch (error) {
        console.error("Font registration failed", error);
    }
}