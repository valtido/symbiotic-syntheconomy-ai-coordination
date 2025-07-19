#!/bin/bash

# Global Regeneration Ceremony (GRC) Setup Script
# Symbiotic Syntheconomy v1.0
# Lead Developer: Valtid Caushi

set -e

echo "🌱 Welcome to the Global Regeneration Ceremony Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18+ first."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi

    print_success "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    print_success "npm $(npm --version) is installed"
}

# Install dependencies for all packages
install_dependencies() {
    print_status "Installing dependencies for all packages..."

    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install

    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..

    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..

    # Install contracts dependencies
    print_status "Installing contracts dependencies..."
    cd contracts
    npm install
    cd ..

    print_success "All dependencies installed successfully"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."

    # Copy example environment files
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Created .env file from template"
    else
        print_warning ".env file already exists, skipping..."
    fi

    if [ ! -f backend/.env ]; then
        cp env.example backend/.env
        print_success "Created backend/.env file from template"
    else
        print_warning "backend/.env file already exists, skipping..."
    fi

    if [ ! -f frontend/.env.local ]; then
        cp env.example frontend/.env.local
        print_success "Created frontend/.env.local file from template"
    else
        print_warning "frontend/.env.local file already exists, skipping..."
    fi

    if [ ! -f contracts/.env ]; then
        cp env.example contracts/.env
        print_success "Created contracts/.env file from template"
    else
        print_warning "contracts/.env file already exists, skipping..."
    fi
}

# Build contracts
build_contracts() {
    print_status "Building smart contracts..."
    cd contracts

    # Compile contracts
    print_status "Compiling Solidity contracts..."
    npm run compile

    # Generate TypeScript types
    print_status "Generating TypeScript types..."
    npm run typechain

    cd ..
    print_success "Smart contracts built successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    print_warning "Please ensure MongoDB Atlas is configured in your .env file"
    print_warning "You can use MongoDB Atlas free tier for development"
}

# Setup IPFS
setup_ipfs() {
    print_status "Setting up IPFS configuration..."
    print_warning "Please configure IPFS settings in your .env file"
    print_warning "You can use Infura IPFS for development"
}

# Setup blockchain
setup_blockchain() {
    print_status "Setting up blockchain configuration..."
    print_warning "Please configure Base testnet settings in your .env file"
    print_warning "You'll need a wallet with testnet ETH for deployment"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    mkdir -p backend/logs
    mkdir -p backend/uploads
    mkdir -p frontend/public/images
    mkdir -p contracts/deploy
    mkdir -p docs

    print_success "Directories created successfully"
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."

    if [ -d .git ]; then
        # Create pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

echo "Pre-commit checks completed"
EOF

        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure environment variables:"
    echo "   - Edit .env files with your actual values"
    echo "   - Set up MongoDB Atlas connection"
    echo "   - Configure IPFS settings"
    echo "   - Add your wallet private key for Base testnet"
    echo ""
    echo "2. Deploy smart contracts:"
    echo "   cd contracts"
    echo "   npm run deploy"
    echo ""
    echo "3. Start development servers:"
    echo "   npm run dev"
    echo ""
    echo "4. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:3001"
    echo "   - API Documentation: http://localhost:3001/docs"
    echo ""
    echo "5. Test the system:"
    echo "   - Use the sample ritual file: sample-ritual.grc"
    echo "   - Submit rituals through the web interface"
    echo "   - Check validation results and blockchain logs"
    echo ""
    echo "📚 Documentation:"
    echo "   - PRD: schemas/prd.md"
    echo "   - API Docs: http://localhost:3001/docs"
    echo "   - README: README.md"
    echo ""
    echo "🔧 Development Commands:"
    echo "   npm run dev          # Start all services"
    echo "   npm run build        # Build all packages"
    echo "   npm run test         # Run all tests"
    echo "   npm run deploy       # Deploy contracts"
    echo ""
    echo "🌍 Cultural Sensitivity:"
    echo "   - Review the sample ritual for cultural context"
    echo "   - Ensure respectful representation of traditions"
    echo "   - Consult with cultural experts when needed"
    echo ""
    echo "Happy coding! 🌱✨"
}

# Main setup function
main() {
    echo "Starting GRC setup..."
    echo ""

    check_nodejs
    check_npm
    install_dependencies
    setup_environment
    create_directories
    build_contracts
    setup_database
    setup_ipfs
    setup_blockchain
    setup_git_hooks
    show_next_steps
}

# Run main function
main "$@"