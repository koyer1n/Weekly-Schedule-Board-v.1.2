/**
 * Authentication and edit mode functionality
 */

// Authentication state
let isEditor = false;

/**
 * Handle authentication for edit mode
 */
function authenticate() {
    const password = prompt("Enter the password to edit:");
    if (password === "asparkofdecency") {
        isEditor = true;
        document.querySelectorAll('.editable').forEach(el => el.contentEditable = "true");
        document.getElementById("saveButton").classList.remove("hidden");

        // Show file upload buttons when in edit mode
        days.forEach(day => {
            document.getElementById(`${day}-upload`).classList.remove("hidden");
        });

        // Add delete buttons to all existing images
        days.forEach(day => {
            const imageContainer = document.getElementById(`${day}-images`);
            const imageItems = imageContainer.querySelectorAll('.image-item');

            imageItems.forEach(item => {
                // Check if delete button already exists
                if (!item.querySelector('.delete-image-btn')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image-btn ml-2 text-red-500 hover:text-red-700';
                    deleteBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    `;
                    deleteBtn.onclick = function(e) { deleteImage(e, this); };
                    item.appendChild(deleteBtn);
                }
            });
        });
    } else {
        alert("Incorrect password.");
    }
}
