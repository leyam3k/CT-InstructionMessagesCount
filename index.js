import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types, chat_metadata, saveChatConditional } from "../../../../script.js";

const MODULE_NAME = 'CT-InstructionMessagesCount';
const extensionFolderPath = `scripts/extensions/third-party/${MODULE_NAME}`;

// Default settings
const defaultSettings = {
    autoHide: false,
    keptInstructions: {} // Per-chat storage: { chatId: { messageHash: true } }
};

// Load settings
function loadSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    
    // Ensure keptInstructions exists
    if (!extension_settings[MODULE_NAME].keptInstructions) {
        extension_settings[MODULE_NAME].keptInstructions = {};
    }
    
    // Update UI
    const autoHideCheckbox = document.querySelector('#ct_imc_auto_hide');
    if (autoHideCheckbox) {
        autoHideCheckbox.checked = extension_settings[MODULE_NAME].autoHide || false;
    }
}

// Generate unique hash for a message to track it across message deletions
function getMessageHash(message) {
    if (!message) return null;
    // Use message content + timestamp as unique identifier
    const content = message.mes || '';
    const timestamp = message.send_date || Date.now();
    return `${content.substring(0, 50)}_${timestamp}`;
}

// Get current chat ID
function getCurrentChatId() {
    const context = getContext();
    return context.chatId || 'default';
}

// Check if instruction is kept
function isInstructionKept(message) {
    const chatId = getCurrentChatId();
    const hash = getMessageHash(message);
    if (!hash) return false;
    
    const keptInstructions = extension_settings[MODULE_NAME].keptInstructions[chatId] || {};
    return keptInstructions[hash] === true;
}

// Toggle kept status
function toggleKeepInstruction(message) {
    const chatId = getCurrentChatId();
    const hash = getMessageHash(message);
    if (!hash) return;
    
    if (!extension_settings[MODULE_NAME].keptInstructions[chatId]) {
        extension_settings[MODULE_NAME].keptInstructions[chatId] = {};
    }
    
    const keptInstructions = extension_settings[MODULE_NAME].keptInstructions[chatId];
    
    if (keptInstructions[hash]) {
        delete keptInstructions[hash];
    } else {
        keptInstructions[hash] = true;
    }
    
    saveSettingsDebounced();
}

// Find all instruction messages
function findInstructionMessages() {
    const context = getContext();
    const allMessages = context.chat || [];
    const instructions = [];
    
    for (let i = 0; i < allMessages.length; i++) {
        const msg = allMessages[i];
        const chName = msg.name || '';
        
        // Check if message name is "Instruction" (case-insensitive)
        if (chName.toLowerCase() === 'instruction') {
            const isHidden = msg.is_system === true;
            const isKept = isInstructionKept(msg);
            
            instructions.push({
                index: i,
                message: msg,
                isHidden: isHidden,
                isKept: isKept,
                content: msg.mes || ''
            });
        }
    }
    
    return instructions;
}

// Get second to last message index
function getSecondToLastMessageIndex() {
    const context = getContext();
    const allMessages = context.chat || [];
    return Math.max(0, allMessages.length - 2);
}

// Auto-hide instructions that are no longer second to last
async function autoHideInstructions() {
    if (!extension_settings[MODULE_NAME].autoHide) return;
    
    const instructions = findInstructionMessages();
    const secondToLastIndex = getSecondToLastMessageIndex();
    let hiddenCount = 0;
    
    for (const inst of instructions) {
        // Skip if kept
        if (inst.isKept) continue;
        
        // Skip if already hidden
        if (inst.isHidden) continue;
        
        // Hide if not at least second to last
        if (inst.index < secondToLastIndex) {
            inst.message.is_system = true;
            
            // Update DOM
            const messageBlock = $(`.mes[mesid="${inst.index}"]`);
            if (messageBlock.length) {
                messageBlock.attr('is_system', 'true');
            }
            
            hiddenCount++;
        }
    }
    
    if (hiddenCount > 0) {
        await saveChatConditional();
    }
}

// Force hide all non-kept instructions that are not second to last
async function forceHideInstructions() {
    const instructions = findInstructionMessages();
    const secondToLastIndex = getSecondToLastMessageIndex();
    let hiddenCount = 0;
    
    for (const inst of instructions) {
        // Skip if kept
        if (inst.isKept) continue;
        
        // Skip if already hidden
        if (inst.isHidden) continue;
        
        // Hide if not at least second to last
        if (inst.index < secondToLastIndex) {
            inst.message.is_system = true;
            
            // Update DOM
            const messageBlock = $(`.mes[mesid="${inst.index}"]`);
            if (messageBlock.length) {
                messageBlock.attr('is_system', 'true');
            }
            
            hiddenCount++;
        }
    }
    
    if (hiddenCount > 0) {
        await saveChatConditional();
        toastr.success(`Hidden ${hiddenCount} instruction message(s)`, MODULE_NAME);
    } else {
        toastr.info('No instructions to hide', MODULE_NAME);
    }
    
    updatePanel();
}

// Navigate to instruction message
function navigateToInstruction(messageIndex) {
    const targetElement = $(`.mes[mesid="${messageIndex}"]`);
    
    if (targetElement.length > 0) {
        targetElement[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight briefly
        targetElement.addClass('ct-imc-highlight');
        setTimeout(() => {
            targetElement.removeClass('ct-imc-highlight');
        }, 2000);
    } else {
        // Message not loaded
        $('#chat').animate({ scrollTop: 0 }, 'smooth');
        toastr.info(`Message #${messageIndex} not loaded. Scroll to top and click "Show More Messages"`, MODULE_NAME);
    }
}

// Toggle keep status and update UI
async function handleKeepToggle(messageIndex) {
    const context = getContext();
    const message = context.chat[messageIndex];
    
    if (!message) return;
    
    toggleKeepInstruction(message);
    
    // If kept and hidden, unhide it
    const isKept = isInstructionKept(message);
    if (isKept && message.is_system === true) {
        message.is_system = false;
        
        const messageBlock = $(`.mes[mesid="${messageIndex}"]`);
        if (messageBlock.length) {
            messageBlock.attr('is_system', 'false');
        }
        
        await saveChatConditional();
    }
    
    updatePanel();
}

// Update counter badge
function updateCounterBadge() {
    const instructions = findInstructionMessages();
    const activeCount = instructions.filter(i => !i.isHidden).length;
    const totalCount = instructions.length;
    
    const trigger = $('#ct_imc_trigger');
    if (trigger.length) {
        const badgeText = `${activeCount}/${totalCount}`;
        trigger.attr('data-ct-imc-badge', badgeText);
        
        // Update tooltip
        trigger.attr('title', `Instruction Messages: ${activeCount} active / ${totalCount} total`);
    }
}

// Update panel content
function updatePanel() {
    const listContainer = $('#ct_imc_list');
    if (listContainer.length === 0) return;
    
    listContainer.empty();
    
    const instructions = findInstructionMessages();
    
    if (instructions.length === 0) {
        listContainer.append('<div class="ct-imc-empty">No instruction messages found</div>');
        updateCounterBadge();
        return;
    }
    
    instructions.forEach(inst => {
        const item = $('<div class="ct-imc-item"></div>');
        if (inst.isHidden) {
            item.addClass('ct-imc-hidden');
        }
        
        // Message number and preview
        const preview = inst.content.substring(0, 60) + (inst.content.length > 60 ? '...' : '');
        const messageInfo = $(`
            <div class="ct-imc-message-info">
                <div class="ct-imc-message-number">#${inst.index}</div>
                <div class="ct-imc-message-preview" title="${inst.content}">${preview}</div>
            </div>
        `);
        
        // Action buttons
        const actions = $('<div class="ct-imc-actions"></div>');
        
        // Keep button
        const keepBtn = $(`
            <div class="ct-imc-btn ct-imc-keep-btn ${inst.isKept ? 'ct-imc-kept' : ''}" 
                 title="${inst.isKept ? 'Unkeep instruction' : 'Keep instruction'}">
                <i class="fa-solid fa-thumbtack"></i>
            </div>
        `);
        keepBtn.on('click', (e) => {
            e.stopPropagation();
            handleKeepToggle(inst.index);
        });
        
        // Navigate button
        const navBtn = $(`
            <div class="ct-imc-btn ct-imc-nav-btn" title="Navigate to message">
                <i class="fa-solid fa-location-arrow"></i>
            </div>
        `);
        navBtn.on('click', (e) => {
            e.stopPropagation();
            navigateToInstruction(inst.index);
        });
        
        actions.append(keepBtn).append(navBtn);
        item.append(messageInfo).append(actions);
        
        // Click on item to navigate
        item.on('click', () => navigateToInstruction(inst.index));
        
        listContainer.append(item);
    });
    
    updateCounterBadge();
}

// Toggle panel
function togglePanel() {
    const panel = $('#ct_imc_panel');
    
    if (panel.hasClass('ct-imc-open')) {
        panel.removeClass('ct-imc-open');
    } else {
        updatePanel();
        panel.addClass('ct-imc-open');
    }
}

// Close panel
function closePanel() {
    $('#ct_imc_panel').removeClass('ct-imc-open');
}

// Create trigger button
function createTrigger() {
    const leftSendForm = document.getElementById('leftSendForm');
    if (!leftSendForm) return;
    
    // Remove existing
    $('#ct_imc_trigger').remove();
    
    const trigger = $(`
        <div id="ct_imc_trigger" class="ct-imc-trigger fa-solid fa-list-check interactable" 
             title="Instruction Messages" 
             tabindex="0" 
             role="button"
             data-ct-imc-badge="0/0">
        </div>
    `);
    
    trigger.on('click', togglePanel);
    $(leftSendForm).append(trigger);
    
    updateCounterBadge();
}

// Create panel
function createPanel() {
    // Remove existing
    $('#ct_imc_panel').remove();
    
    const panel = $(`
        <div id="ct_imc_panel" class="ct-imc-panel">
            <div class="ct-imc-header">
                <h3>Instruction Messages</h3>
                <div class="ct-imc-controls">
                    <div id="ct_imc_force_hide" class="fa-solid fa-eye-slash interactable"
                         title="Force hide old instructions"></div>
                    <div id="ct_imc_refresh" class="fa-solid fa-rotate interactable"
                         title="Refresh"></div>
                </div>
            </div>
            <div id="ct_imc_list" class="ct-imc-list"></div>
        </div>
    `);
    
    $('body').append(panel);
    
    $('#ct_imc_refresh').on('click', updatePanel);
    $('#ct_imc_force_hide').on('click', forceHideInstructions);
    
    // Close when clicking outside
    $(document).on('click', (e) => {
        if (!$(e.target).closest('#ct_imc_panel, #ct_imc_trigger').length) {
            closePanel();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    eventSource.on(event_types.CHAT_CHANGED, () => {
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        autoHideInstructions();
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.MESSAGE_SENT, () => {
        autoHideInstructions();
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.MESSAGE_DELETED, () => {
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.MESSAGE_EDITED, () => {
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.MESSAGE_UPDATED, () => {
        updatePanel();
        updateCounterBadge();
    });
    
    eventSource.on(event_types.CHAT_UPDATED, () => {
        updatePanel();
        updateCounterBadge();
    });
}

// Setup mutation observer for hide/unhide
function setupHideObserver() {
    const chatContainer = document.getElementById('chat');
    if (!chatContainer) return;
    
    let updateTimeout;
    const debouncedUpdate = () => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            updatePanel();
            updateCounterBadge();
        }, 100);
    };
    
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'is_system' &&
                mutation.target.classList.contains('mes')) {
                debouncedUpdate();
                break;
            }
        }
    });
    
    observer.observe(chatContainer, {
        attributes: true,
        attributeFilter: ['is_system'],
        subtree: true
    });
}

// Handle auto-hide toggle
function onAutoHideChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[MODULE_NAME].autoHide = value;
    saveSettingsDebounced();
    console.log(`[${MODULE_NAME}] Auto-hide ${value ? 'enabled' : 'disabled'}`);
}

// Initialize extension
async function init() {
    console.log(`[${MODULE_NAME}] Initializing...`);
    
    loadSettings();
    
    // Load settings UI
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        
        $("#ct_imc_auto_hide").on("change", onAutoHideChange);
        $("#ct_imc_auto_hide").prop("checked", extension_settings[MODULE_NAME].autoHide || false);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to load settings:`, error);
    }
    
    // Wait for UI to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    createTrigger();
    createPanel();
    setupEventListeners();
    setupHideObserver();
    updateCounterBadge();
    
    console.log(`[${MODULE_NAME}] Initialized`);
}

// Register extension
jQuery(async () => {
    await init();
});
