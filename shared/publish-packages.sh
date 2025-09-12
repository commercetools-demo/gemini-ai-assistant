#!/bin/bash

# Publish script for AI Assistant packages
# This script publishes ai-assistant-button and ai-assistant-provider packages to npmjs

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Package directories
PACKAGES=(
    "packages/gemini-ai-assistant-button"
    "packages/gemini-ai-assistant-provider"
)

# Package names for output
PACKAGE_NAMES=(
    "@commercetools-demo/gemini-ai-assistant-button"
    "@commercetools-demo/gemini-ai-assistant-provider"
)

echo -e "${BLUE}🚀 Starting package publication process...${NC}"

# Function to check if git is clean
check_git_status() {
    echo -e "${BLUE}📋 Checking git status...${NC}"
    
    if ! git diff-index --quiet HEAD --; then
        echo -e "${RED}❌ Error: Git working directory is not clean. Please commit or stash your changes.${NC}"
        echo -e "${YELLOW}Uncommitted changes found:${NC}"
        git status --porcelain
        exit 1
    fi
    
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${RED}❌ Error: Git working directory is not clean. Please commit or stash your changes.${NC}"
        echo -e "${YELLOW}Untracked or modified files found:${NC}"
        git status --porcelain
        exit 1
    fi
    
    echo -e "${GREEN}✅ Git working directory is clean${NC}"
}

# Function to build packages
build_packages() {
    echo -e "${BLUE}🔨 Building packages...${NC}"
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Error: package.json not found in shared directory${NC}"
        exit 1
    fi
    
    # Run the build script
    echo -e "${YELLOW}Running yarn build...${NC}"
    yarn build
    
    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Function to publish a single package
publish_package() {
    local package_dir=$1
    local package_name=$2
    
    echo -e "${BLUE}📦 Publishing ${package_name}...${NC}"
    
    if [ ! -d "$package_dir" ]; then
        echo -e "${RED}❌ Error: Package directory $package_dir not found${NC}"
        return 1
    fi
    
    cd "$package_dir"
    
    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Error: dist directory not found in $package_dir. Build may have failed.${NC}"
        cd - > /dev/null
        return 1
    fi
    
    # Get current version
    local current_version=$(node -p "require('./package.json').version")
    echo -e "${YELLOW}Current version: ${current_version}${NC}"
    
    # Pack with Yarn to rewrite workspace: ranges, then publish the tarball with npm
    echo -e "${YELLOW}Packing with Yarn (rewriting workspace: deps)...${NC}"
    TARBALL="$(mktemp -t package.XXXXXX).tgz"
    if yarn pack --filename "$TARBALL"; then
        echo -e "${YELLOW}Publishing ${TARBALL} to npmjs...${NC}"
        if npm publish "${TARBALL}"; then
            echo -e "${GREEN}✅ Successfully published ${package_name}@${current_version}${NC}"
        else
            echo -e "${RED}❌ Failed to publish ${package_name}${NC}"
            rm -f "${TARBALL}" || true
            cd - > /dev/null
            return 1
        fi
        rm -f "${TARBALL}" || true
    else
        echo -e "${RED}❌ Yarn pack failed for ${package_name}${NC}"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
}

# Function to check npm authentication
check_npm_auth() {
    echo -e "${BLUE}🔐 Checking npm authentication...${NC}"
    
    if ! npm whoami > /dev/null 2>&1; then
        echo -e "${RED}❌ Error: Not logged in to npm. Please run 'npm login' first.${NC}"
        exit 1
    fi
    
    local npm_user=$(npm whoami)
    echo -e "${GREEN}✅ Logged in to npm as: ${npm_user}${NC}"
}

# Function to confirm publication
confirm_publication() {
    echo -e "${YELLOW}⚠️  You are about to publish the following packages:${NC}"
    for package_name in "${PACKAGE_NAMES[@]}"; do
        echo -e "  • ${package_name}"
    done
    
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📋 Publication cancelled by user${NC}"
        exit 0
    fi
}

# Main execution
main() {
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}  AI Assistant Package Publication Script${NC}"
    echo -e "${BLUE}===========================================${NC}"
    
    # Check npm authentication
    check_npm_auth
    
    # Check git status
    check_git_status
    
    # Confirm publication
    confirm_publication
    
    # Build packages
    build_packages
    
    echo -e "${BLUE}📦 Publishing packages...${NC}"
    
    # Publish each package
    local failed_packages=()
    for i in "${!PACKAGES[@]}"; do
        if ! publish_package "${PACKAGES[$i]}" "${PACKAGE_NAMES[$i]}"; then
            failed_packages+=("${PACKAGE_NAMES[$i]}")
        fi
    done
    
    # Summary
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}   Publication Summary${NC}"
    echo -e "${BLUE}===========================================${NC}"
    
    if [ ${#failed_packages[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 All packages published successfully!${NC}"
        for package_name in "${PACKAGE_NAMES[@]}"; do
            echo -e "${GREEN}  ✅ ${package_name}${NC}"
        done
    else
        echo -e "${RED}❌ Some packages failed to publish:${NC}"
        for package_name in "${failed_packages[@]}"; do
            echo -e "${RED}  ❌ ${package_name}${NC}"
        done
        
        echo -e "${GREEN}✅ Successfully published:${NC}"
        for package_name in "${PACKAGE_NAMES[@]}"; do
            if [[ ! " ${failed_packages[@]} " =~ " ${package_name} " ]]; then
                echo -e "${GREEN}  ✅ ${package_name}${NC}"
            fi
        done
        
        exit 1
    fi
}

# Run the main function
main "$@"