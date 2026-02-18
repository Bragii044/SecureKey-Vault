
## Deployment

### GitHub Upload

1.  Initialize git repository (if not already done):
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

2.  Create a new repository on GitHub (https://github.com/new).

3.  Link and push:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git branch -M main
    git push -u origin main
    ```

### Desktop App (Electron)

1.  Build the executable:
    ```bash
    npm run build:electron
    ```

2.  The installer will be located in the `release` directory.
    - Windows: `release/SecureKey Vault Setup 1.0.0.exe`
