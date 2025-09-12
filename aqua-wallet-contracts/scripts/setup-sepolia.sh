#!/bin/bash

echo "🔧 Setting up Sepolia deployment environment..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
    echo "# Sepolia Testnet Configuration" >> .env
    echo "SEPOLIA_RPC_URL=" >> .env
    echo "SEPOLIA_PRIVATE_KEY=" >> .env
    echo ""
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📝 Please add your Sepolia configuration to the .env file:"
echo ""
echo "1. Get a Sepolia RPC URL from one of these providers:"
echo "   - Alchemy: https://www.alchemy.com/"
echo "   - Infura: https://infura.io/"
echo "   - QuickNode: https://www.quicknode.com/"
echo "   - Or use a public RPC: https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
echo ""
echo "2. Get Sepolia ETH for gas fees:"
echo "   - Sepolia Faucet: https://sepoliafaucet.com/"
echo "   - Alchemy Faucet: https://sepoliafaucet.com/"
echo "   - Chainlink Faucet: https://faucets.chain.link/sepolia"
echo ""
echo "3. Add your configuration to .env file:"
echo "   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
echo "   SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY"
echo ""
echo "4. Then run:"
echo "   source .env"
echo "   npm run deploy:revision -- --network sepolia"
echo ""
echo "⚠️  Never commit your private key to version control!"
