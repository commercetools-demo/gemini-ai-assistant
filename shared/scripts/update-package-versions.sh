#!/bin/bash

#
# update-package-versions.sh
#
# Updates the version field across all package.json files under packages/.
#
# Usage:
#   ./scripts/update-package-versions.sh --bump patch
#   ./scripts/update-package-versions.sh --bump minor
#   ./scripts/update-package-versions.sh --bump major
#   ./scripts/update-package-versions.sh --set 1.2.3
#
# Options:
#   --bump [patch|minor|major]    Bump the current version (default: patch if neither --bump nor --set provided)
#   --set <version>               Set all packages to the specific version
#   --packages-dir <path>         Override packages directory (default: packages)
#   --dry                         Show changes without writing files
#   --help, -h                    Show this help message

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BUMP=""
SET_VERSION=""
PACKAGES_DIR=""
DRY_RUN=false

# Function to print help
print_help() {
    cat << EOF

Update versions for all packages under packages/.

Usage:
  ./scripts/update-package-versions.sh --bump patch
  ./scripts/update-package-versions.sh --bump minor
  ./scripts/update-package-versions.sh --bump major
  ./scripts/update-package-versions.sh --set 1.2.3

Options:
  --bump [patch|minor|major]    Bump the current version (default: patch if neither --bump nor --set provided)
  --set <version>               Set all packages to the specific version
  --packages-dir <path>         Override packages directory (default: packages)
  --dry                         Show changes without writing files
  --help, -h                    Show this help message

EOF
}

# Function to validate semantic version
is_semver() {
    local version="$1"
    if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z\-.]+)?(\+[0-9A-Za-z\-.]+)?$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to bump version
bump_version() {
    local current="$1"
    local bump="$2"
    
    if [[ ! $current =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(.*)$ ]]; then
        echo -e "${RED}❌ Invalid semver: $current${NC}" >&2
        exit 1
    fi
    
    local major="${BASH_REMATCH[1]}"
    local minor="${BASH_REMATCH[2]}"
    local patch="${BASH_REMATCH[3]}"
    
    case $bump in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            echo -e "${RED}❌ Invalid bump type: $bump${NC}" >&2
            exit 1
            ;;
    esac
    
    echo "${major}.${minor}.${patch}"
}

# Function to read JSON value
read_json_version() {
    local file="$1"
    # Using node to safely parse JSON if available, otherwise use grep/sed
    if command -v node >/dev/null 2>&1; then
        node -p "require('$file').version" 2>/dev/null || echo ""
    else
        # Fallback to grep/sed (less robust but works)
        grep -E '^\s*"version"\s*:' "$file" | sed 's/.*"version"\s*:\s*"\([^"]*\)".*/\1/' || echo ""
    fi
}

# Function to update JSON version
update_json_version() {
    local file="$1"
    local new_version="$2"
    
    if command -v node >/dev/null 2>&1; then
        # Use node for safe JSON manipulation
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$file', 'utf8'));
            pkg.version = '$new_version';
            fs.writeFileSync('$file', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        "
    else
        # Fallback to sed (less robust)
        sed -i.bak "s/\"version\":\s*\"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
        rm -f "$file.bak"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --bump)
                BUMP="$2"
                shift 2
                ;;
            --set)
                SET_VERSION="$2"
                shift 2
                ;;
            --packages-dir)
                PACKAGES_DIR="$2"
                shift 2
                ;;
            --dry)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                print_help
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}" >&2
                print_help
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    parse_args "$@"
    
    # Set defaults
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local repo_root="$(cd "$script_dir/.." && pwd)"
    local packages_dir="${PACKAGES_DIR:-$repo_root/packages}"
    
    # Validate packages directory
    if [[ ! -d "$packages_dir" ]]; then
        echo -e "${RED}❌ Packages directory not found: $packages_dir${NC}" >&2
        exit 1
    fi
    
    # Determine operation mode
    local mode=""
    if [[ -n "$SET_VERSION" ]]; then
        mode="set"
        if ! is_semver "$SET_VERSION"; then
            echo -e "${RED}❌ Invalid --set version: $SET_VERSION${NC}" >&2
            exit 1
        fi
    else
        mode="bump"
        BUMP="${BUMP:-patch}"
        if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
            echo -e "${RED}❌ Invalid --bump value: $BUMP. Use patch|minor|major${NC}" >&2
            exit 1
        fi
    fi
    
    echo -e "${BLUE}🔧 Updating package versions...${NC}"
    echo -e "${BLUE}Mode: $mode${NC}"
    if [[ "$mode" == "bump" ]]; then
        echo -e "${BLUE}Bump type: $BUMP${NC}"
    else
        echo -e "${BLUE}Target version: $SET_VERSION${NC}"
    fi
    echo -e "${BLUE}Packages directory: $packages_dir${NC}"
    echo ""
    
    # Find all package directories
    local changes=()
    
    for package_path in "$packages_dir"/*; do
        if [[ ! -d "$package_path" ]]; then
            continue
        fi
        
        local pkg_file="$package_path/package.json"
        if [[ ! -f "$pkg_file" ]]; then
            continue
        fi
        
        local current_version
        current_version=$(read_json_version "$pkg_file")
        
        if [[ -z "$current_version" ]]; then
            continue
        fi
        
        local next_version="$current_version"
        if [[ "$mode" == "set" ]]; then
            next_version="$SET_VERSION"
        else
            next_version=$(bump_version "$current_version" "$BUMP")
        fi
        
        if [[ "$current_version" != "$next_version" ]]; then
            local package_name
            if command -v node >/dev/null 2>&1; then
                package_name=$(node -p "require('$pkg_file').name" 2>/dev/null || basename "$package_path")
            else
                package_name=$(basename "$package_path")
            fi
            
            changes+=("$package_name|$current_version|$next_version|$pkg_file")
            
            if [[ "$DRY_RUN" == false ]]; then
                update_json_version "$pkg_file" "$next_version"
            fi
        fi
    done
    
    # Display results
    if [[ ${#changes[@]} -eq 0 ]]; then
        echo -e "${YELLOW}No packages updated.${NC}"
    else
        if [[ "$DRY_RUN" == true ]]; then
            echo -e "${YELLOW}Planned updates:${NC}"
        else
            echo -e "${GREEN}Updated packages:${NC}"
        fi
        
        for change in "${changes[@]}"; do
            IFS='|' read -r name from to file <<< "$change"
            echo -e "  • ${name}: ${from} -> ${to}"
        done
    fi
}

# Run main function with all arguments
main "$@"
