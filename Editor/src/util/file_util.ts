import JSZip from 'jszip';

export function download(content: any, filename: string) {
    const a = document.createElement('a'); // Create "a" element
    const blob = new Blob([content]); // Create a blob (file-like object)
    const url = URL.createObjectURL(blob); // Create an object URL from blob

    a.setAttribute('href', url); // Set "a" element link
    a.setAttribute('download', filename); // Set download filename
    a.click();
}

export function downloadAsZip(zipFilename: string, files: { content: any, filename: string }[]) {
    const zip = new JSZip();

    files.forEach((file) => {
        zip.file(file.filename, file.content);
    });

    zip.generateAsync({type:"blob"}).then(function(content: any) {
        download(content, zipFilename);
    });
}