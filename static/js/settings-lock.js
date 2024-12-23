// Password protection for settings
function lockSettings() {
    const settingsTab = document.getElementById('settings-tab');
    const lockHtml = `
        <div id="settingsLock" class="text-center p-4">
            <h4>Settings Locked</h4>
            <input type="password" id="settingsPass" class="form-control w-50 mx-auto my-3" placeholder="Enter password">
            <button onclick="unlockSettings()" class="btn btn-primary">Unlock Settings</button>
        </div>
        <div id="settingsContent" style="display:none">
            ${settingsTab.innerHTML}
        </div>
    `;
    settingsTab.innerHTML = lockHtml;
}

function unlockSettings() {
    const pass = document.getElementById('settingsPass').value;
    if (pass === 'admin123') {
        document.getElementById('settingsLock').style.display = 'none';
        document.getElementById('settingsContent').style.display = 'block';
    } else {
        alert('Wrong password');
    }
    document.getElementById('settingsPass').value = '';
}

// Initialize lock when page loads
document.addEventListener('DOMContentLoaded', lockSettings);

// Lock settings when switching tabs
document.addEventListener('shown.bs.tab', function (e) {
    if (e.target.getAttribute('href') !== '#settings-tab') {
        lockSettings();
    }
});
