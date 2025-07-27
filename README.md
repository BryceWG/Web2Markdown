# Web2Markdown - Firefox Extension

A Firefox browser extension that converts webpage content to markdown format using LLM (Large Language Model) APIs.

## Features

- 🔄 **One-click conversion**: Convert any webpage to clean markdown format
- 🤖 **LLM Integration**: Supports multiple LLM providers (OpenAI, Anthropic, etc.)
- ⚙️ **Customizable Settings**: Configure API endpoints, models, prompts, and behavior
- 📋 **Clipboard Integration**: Automatically copy results to clipboard
- 🔔 **System Notifications**: Get notified when conversion is complete
- 🎯 **Smart Content Extraction**: Intelligently extracts main content while filtering out ads and navigation

## Installation

### Install from Firefox Add-ons Store
*Coming soon...*

### Manual Installation (Developer Mode)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Navigate to the extension folder and select `manifest.json`

## Setup

1. **Install the extension** following the steps above
2. **Configure API settings**:
   - Click the extension icon in the toolbar
   - Click "Settings" to open the options page
   - Enter your LLM API details:
     - API Endpoint (e.g., `https://api.openai.com/v1/chat/completions`)
     - Model name (e.g., `gpt-3.5-turbo`)
     - API Key
   - Customize the system prompt if needed
   - Adjust other settings as desired
3. **Test the connection** using the "Test Connection" button
4. **Save your settings**

## Usage

### Manual Conversion
1. Navigate to any webpage
2. Click the Web2Markdown extension icon
3. Click "Convert to Markdown"
4. Wait for the conversion to complete
5. The result will be displayed and optionally copied to clipboard

### Settings Options
- **LLM Configuration**: Set your preferred API endpoint, model, and API key
- **System Prompt**: Customize how the AI processes content
- **Temperature**: Control the creativity/randomness of the output (0.0-2.0)
- **Auto-copy**: Automatically copy results to clipboard
- **Notifications**: Enable/disable system notifications
- **Auto-extract**: Experimental feature to auto-convert on page load

## Supported LLM Providers

- **OpenAI** (GPT-3.5, GPT-4)
- **Anthropic** (Claude)
- **Together AI** (Llama, other open models)
- **Custom APIs** compatible with OpenAI format

## File Structure

```
Web2Markdown/
├── manifest.json          # Extension manifest
├── background.js          # Background script for API calls
├── content.js            # Content script for page extraction
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
├── icons/                # Extension icons
└── README.md             # This file
```

## Privacy & Security

- All API keys are stored locally in your browser
- No data is sent to our servers
- Content is only sent to your configured LLM provider
- The extension only accesses the current active tab when triggered

## Development

### Prerequisites
- Firefox Developer Edition (recommended)
- Text editor or IDE

### Development Setup
1. Clone the repository
2. Make your changes
3. Load the extension in Firefox using `about:debugging`
4. Test your changes
5. Submit a pull request

### Building for Production
The extension is ready to use as-is. For distribution:
1. Zip all files except README.md
2. Submit to Firefox Add-ons store

## Troubleshooting

### Common Issues

**"API key not configured"**
- Go to Settings and enter your LLM provider API key

**"Connection failed"**
- Check your API endpoint URL
- Verify your API key is correct
- Ensure you have internet connection
- Check if your API provider is experiencing issues

**"Failed to extract content"**
- Try refreshing the page
- The page might be using dynamic content loading
- Some pages may block content extraction

**No conversion happening**
- Make sure the extension has permission to access the current tab
- Check browser console for error messages

### Getting Help
If you encounter issues:
1. Check the browser console for error messages
2. Verify your settings in the options page
3. Test the API connection using the "Test Connection" button
4. Open an issue on GitHub with details about the problem

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.