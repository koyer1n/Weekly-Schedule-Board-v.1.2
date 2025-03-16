/**
 * Image handling functionality for upload, display, and deletion
 */

/**
 * Trigger file upload for a specific day
 * @param {string} day - Day of the week
 */
function handleFileUpload(day) {
    const fileInput = document.getElementById(`${day}-file`);
    fileInput.click();
}

/**
 * Handle file selection and display preview
 * @param {Event} event - The file input change event
 * @param {string} day - Day of the week
 */
function handleFileSelect(event, day) {
    const files = event.target.files;
    const imageContainer = document.getElementById(`${day}-images`);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function(e) {
            const imageData = e.target.result;
            const fileName = file.name;

            // Create image preview with delete button
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-item mb-2 flex items-center';
            previewDiv.innerHTML = `
                <span class="image-filename mr-2">${fileName}</span>
                <button class="delete-image-btn ml-2 text-red-500 hover:text-red-700"
                        onclick="deleteImage(event, this)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <input type="hidden" class="image-data" value="${imageData}">
            `;

            imageContainer.appendChild(previewDiv);
            imageContainer.classList.remove('hidden');
        };

        reader.readAsDataURL(file);
    }
}

/**
 * Delete an image from the container
 * @param {Event} event - The click event
 * @param {HTMLElement} button - The delete button element
 */
function deleteImage(event, button) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("정말로 이 이미지를 삭제하시겠습니까?")) {
        const imageItem = button.closest('.image-item');
        const imageContainer = imageItem.parentNode;

        // Remove the image item
        imageContainer.removeChild(imageItem);

        // If no more images, hide the container
        if (imageContainer.children.length === 0) {
            imageContainer.classList.add('hidden');
        }
    }
}

/**
 * Show a popup with the full image
 * @param {string} fileName - Name of the image file
 * @param {string} imageData - Base64 encoded image data
 */
function showImagePopup(fileName, imageData) {
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
    popup.id = 'image-popup';
    popup.onclick = closeImagePopup;

    popup.innerHTML = `
        <div class="bg-white p-4 rounded-lg max-w-4xl max-h-screen overflow-auto">
            <h3 class="text-xl font-bold mb-2">${fileName}</h3>
            <img src="${imageData}" alt="${fileName}" class="max-w-full">
        </div>
    `;

    document.body.appendChild(popup);
}

/**
 * Close the image popup
 */
function closeImagePopup() {
    const popup = document.getElementById('image-popup');
    if (popup) {
        document.body.removeChild(popup);
    }
}
