import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { printBanner, printSuccessBanner, isCancel, cancelAndExit } from '../utils/prompts.js';
import { BOT_MAINNET, BOT_TESTNET } from '../constants.js';
import {
  listTemplates,
  copyTemplate,
  copyContractStarter,
  applyTailwind,
  applyLinting,
  type TemplateDescriptor,
} from '../utils/template.js';
import execa from 'execa';
import {
  packageManagerLabel,
  getInstallCommand,
  getInstallCommandString,
  getDevCommandString,
  runPackageManager,
  type PackageManager,
} from '../utils/packageManager.js';

export const initCommand = new Command('init')
  .description('Scaffold a new BOT Chain project')
  .option('-n, --name <name>', 'Project name')
  .option('-t, --type <type>', 'Project type (contracts|fullstack)')
  .option('-f, --framework <framework>', 'Smart contract framework (foundry|hardhat)')
  .option('-s, --starter <starter>', 'Contract starter template (counter|guess-the-number)')
  .option('-l, --linter <linter>', 'Linting/formatting setup (none|prettier|eslint-prettier)')
  .option('-m, --template <template>', 'Frontend template (vite-react|nextjs-react|vite-vue|vite-vanilla)')
  .option('--pm <packageManager>', 'Package manager (npm|yarn|bun)')
  .option('--no-git', 'Skip git repository initialization')
  .option('--yes', 'Skip confirmation prompts')
  .action(async (options) => {
    // ── (list is now a subcommand: bot init list) ─────────────────────
    if (false) {
      console.log();
      console.log(chalk.bold.cyanBright('  📦  Available Templates'));
      console.log();
      console.log(chalk.dim('  Contract Frameworks:'));
      console.log(`    ${chalk.cyan('foundry')}      Foundry (forge) — fast, Rust-based`);
      console.log(`    ${chalk.cyan('hardhat')}      Hardhat — JS/TS, extensive plugin ecosystem`);
      console.log();
      console.log(chalk.dim('  Contract Starters:'));
      console.log(`    ${chalk.cyan('counter')}      Simple counter contract (read/write state)`);
      console.log(`    ${chalk.cyan('guess-the-number')}  Number guessing game contract`);
      console.log();
      console.log(chalk.dim('  Frontend Templates (Fullstack dApp only):'));
      console.log(`    ${chalk.cyan('nextjs-react')}     Next.js 14 + React + RainbowKit + Wagmi`);
      console.log(`    ${chalk.cyan('vite-react')}       Vite + React + RainbowKit + Wagmi`);
      console.log(`    ${chalk.cyan('vite-vue')}         Vite + Vue 3`);
      console.log(`    ${chalk.cyan('vite-vanilla')}     Vite + Vanilla JS`);
      console.log();
      console.log(chalk.dim('  Package Managers:'));
      console.log(`    ${chalk.cyan('bun')}   ${chalk.cyan('npm')}   ${chalk.cyan('yarn')}   ${chalk.cyan('pnpm')}`);
      console.log();
      console.log(`  Run ${chalk.cyan('bot init')} to start interactive scaffolding.`);
      console.log();
      return;
    }

    printBanner();

    let projectName: string = options.name || '';

    if (!projectName) {
      while (true) {
        const input = await p.text({
          message: 'What is your project name?',
          placeholder: 'my-bot-app',
          validate: (value) => {
            if (!value || value.trim().length === 0) return 'Project name is required';
            if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Use letters, numbers, dashes, and underscores only';
          },
        });
        if (isCancel(input)) cancelAndExit();
        projectName = input as string;

        const targetDir = path.resolve(process.cwd(), projectName);
        if (await fs.pathExists(targetDir)) {
          p.note(`Directory ${chalk.cyan(projectName)} already exists. Pick a different name.`, chalk.yellow('Already exists'));
          continue;
        }
        break;
      }
    }

    const projectType = options.type || (await p.select<
      { value: 'contracts' | 'fullstack'; label: string; hint?: string }[],
      'contracts' | 'fullstack'
    >({
      message: 'What are you building?',
      options: [
        { value: 'contracts', label: 'Smart Contracts Only', hint: 'Foundry or Hardhat project' },
        { value: 'fullstack', label: 'Fullstack dApp', hint: 'Contracts + frontend' },
      ],
    }));
    if (isCancel(projectType)) cancelAndExit();

    const framework = options.framework || (await p.select<
      { value: 'foundry' | 'hardhat'; label: string; hint?: string }[],
      'foundry' | 'hardhat'
    >({
      message: 'Choose a contract framework:',
      initialValue: 'foundry',
      options: [
        { value: 'foundry', label: 'Foundry' },
        { value: 'hardhat', label: 'Hardhat' },
      ],
    }));
    if (isCancel(framework)) cancelAndExit();

    const contractFramework = framework === 'hardhat' ? 'hardhat' : 'foundry';

    const network = options.yes ? 'testnet' : await p.select<
      { value: 'testnet' | 'mainnet'; label: string; hint?: string }[],
      'testnet' | 'mainnet'
    >({
      message: 'Which network do you want to target by default?',
      initialValue: 'testnet',
      options: [
        { value: 'testnet', label: 'BOT Testnet', hint: BOT_TESTNET.rpcUrl },
        { value: 'mainnet', label: 'BOT Mainnet', hint: BOT_MAINNET.rpcUrl },
      ],
    });
    if (isCancel(network)) cancelAndExit();

    const selectedNetwork = network === 'mainnet' ? BOT_MAINNET : BOT_TESTNET;

    const contractStarter = options.starter || (await p.select<
      { value: 'counter' | 'guess-the-number'; label: string; hint?: string }[],
      'counter' | 'guess-the-number'
    >({
      message: 'Choose a contract starter:',
      initialValue: 'counter',
      options: [
        { value: 'counter', label: 'Counter', hint: 'Simple storage contract' },
        { value: 'guess-the-number', label: 'Guess the Number', hint: 'Interactive game contract' },
      ],
    }));
    if (isCancel(contractStarter)) cancelAndExit();

    const starterConfig = {
      counter: {
        contractName: 'Counter',
        contractFile: 'Counter',
        deployScriptName: 'DeployCounter',
      },
      'guess-the-number': {
        contractName: 'GuessTheNumber',
        contractFile: 'GuessTheNumber',
        deployScriptName: 'DeployGuessTheNumber',
      },
    }[contractStarter as 'counter' | 'guess-the-number'] || {
      contractName: 'Counter',
      contractFile: 'Counter',
      deployScriptName: 'DeployCounter',
    };

    let frontendTemplate: TemplateDescriptor | undefined;
    if (projectType === 'fullstack') {
      const templates = await listTemplates();
      const frontendTemplates = templates.filter((t) => t.type === 'frontend');

      const selectedName = options.template || (await p.select<
        { value: string; label: string; hint?: string }[],
        string
      >({
        message: 'Choose a frontend template:',
        options: frontendTemplates.map((t) => ({
          value: t.name,
          label: t.label,
          hint: t.description,
        })),
      }));
      if (isCancel(selectedName)) cancelAndExit();

      frontendTemplate = frontendTemplates.find((t) => t.name === selectedName);
    }

    const linting = options.yes ? 'none' : options.linter || (await p.select<
      { value: 'none' | 'prettier' | 'eslint-prettier'; label: string; hint?: string }[],
      'none' | 'prettier' | 'eslint-prettier'
    >({
      message: 'Choose a linter/formatter setup:',
      initialValue: 'none',
      options: [
        { value: 'none', label: 'None', hint: 'No extra linter configuration' },
        { value: 'prettier', label: 'Prettier', hint: 'Code formatting' },
        { value: 'eslint-prettier', label: 'ESLint + Prettier', hint: 'Linting and formatting' },
      ],
    }));
    if (isCancel(linting)) cancelAndExit();

    const packageManager = options.yes ? 'npm' : options.pm || (await p.select<
      { value: PackageManager; label: string }[],
      PackageManager
    >({
      message: 'Which package manager do you want to use?',
      initialValue: 'npm',
      options: [
        { value: 'npm', label: packageManagerLabel('npm') },
        { value: 'yarn', label: packageManagerLabel('yarn') },
        { value: 'bun', label: packageManagerLabel('bun') },
      ],
    }));
    if (isCancel(packageManager)) cancelAndExit();

    const useTypeScript = true;

    const initializeGit = options.yes
      ? true
      : options.git !== undefined
      ? options.git
      : await p.confirm({
          message: 'Initialize a git repository?',
          initialValue: true,
        });
    if (isCancel(initializeGit)) cancelAndExit();

    const contractTemplateName = contractFramework === 'hardhat' ? 'hardhat-basic' : 'foundry-basic';
    const targetDir = path.resolve(process.cwd(), projectName);

    if (!options.yes && !options.name) {
      const shouldContinue = await p.confirm({
        message: `Create ${chalk.cyan(projectName)} with the selected options?`,
        initialValue: true,
      });
      if (isCancel(shouldContinue) || !shouldContinue) cancelAndExit();
    }

    const s = p.spinner();
    s.start('Scaffolding project...');

    try {
      const variables: Record<string, string> = {
        projectName: projectName,
        installCommand: getInstallCommandString(packageManager as PackageManager),
        devCommand: getDevCommandString(packageManager as PackageManager),
        chainId: String(selectedNetwork.chainId),
        rpcUrl: selectedNetwork.rpcUrl,
        networkName: selectedNetwork.name,
        contractName: starterConfig.contractName,
        contractFile: starterConfig.contractFile,
        deployScriptName: starterConfig.deployScriptName,
      };

      await fs.ensureDir(targetDir);

      if (projectType === 'contracts') {
        await copyTemplate(contractTemplateName, targetDir, variables);
        await copyContractStarter(contractStarter as any, targetDir, variables);
      } else {
        await fs.ensureDir(path.join(targetDir, 'contracts'));
        await fs.ensureDir(path.join(targetDir, 'frontend'));

        await copyTemplate(contractTemplateName, path.join(targetDir, 'contracts'), variables);
        await copyContractStarter(contractStarter as any, path.join(targetDir, 'contracts'), variables);
        if (frontendTemplate) {
          await copyTemplate(frontendTemplate.name, path.join(targetDir, 'frontend'), variables);
        }

        await fs.writeFile(
          path.join(targetDir, 'README.md'),
          generateRootReadme(
            projectName,
            frontendTemplate?.name,
            getDevCommandString(packageManager as PackageManager),
            starterConfig.deployScriptName,
          ),
          'utf-8',
        );
      }

      s.stop('Templates copied.');

      if (initializeGit) {
        const git = p.spinner();
        git.start('Initializing git repository...');
        try {
          await execa('git', ['init'], { cwd: targetDir });
          git.stop('Git repository initialized.');
        } catch {
          git.stop('Git initialization failed.');
          p.note('Make sure git is installed, or initialize the repo manually.', chalk.yellow('Note'));
        }
      }

      if (projectType === 'fullstack') {
        const frontendDir = path.join(targetDir, 'frontend');

        const tw = p.spinner();
        tw.start('Setting up Tailwind CSS...');
        await applyTailwind(frontendDir, packageManager as PackageManager);
        tw.stop('Tailwind CSS configured.');

        const install = p.spinner();
        install.start(`Installing frontend dependencies with ${packageManagerLabel(packageManager as PackageManager)}...`);
        await runPackageManager(
          packageManager as PackageManager,
          getInstallCommand(packageManager as PackageManager),
          frontendDir,
        );
        install.stop('Dependencies installed.');

        if (linting !== 'none') {
          const lint = p.spinner();
          lint.start('Setting up linting / formatting...');
          await applyLinting(
            frontendDir,
            packageManager as PackageManager,
            linting,
            useTypeScript as boolean,
          );
          lint.stop('Linting / formatting configured.');
        }
      } else if (linting !== 'none') {
        const lint = p.spinner();
        lint.start('Setting up formatting...');
        await applyLinting(
          targetDir,
          packageManager as PackageManager,
          linting,
          false,
        );
        lint.stop('Formatting configured.');
      }

      // ── Contract Build & Artifact Injection ────────────────────
      const contractDir = projectType === 'fullstack'
        ? path.join(targetDir, 'contracts')
        : targetDir;

      if (contractFramework === 'hardhat') {
        const hhSpinner = p.spinner();
        hhSpinner.start('Installing Hardhat dependencies & compiling contracts...');
        try {
          await runPackageManager(packageManager as PackageManager, getInstallCommand(packageManager as PackageManager), contractDir);
          await execa('npx', ['hardhat', 'compile'], { cwd: contractDir });
          hhSpinner.stop('Hardhat contracts compiled.');
        } catch {
          hhSpinner.stop('Hardhat compilation skipped or failed.');
        }
      } else {
        // Foundry build flow
        let forgeAvailable = false;
        try {
          await execa('forge', ['--version'], { cwd: targetDir });
          forgeAvailable = true;
        } catch {
          p.note(
            'Forge (Foundry) not detected. Install it with:\n  curl -L https://foundry.paradigm.xyz | bash && foundryup\n\nAfter installing, run `forge install && forge build` in the contracts/ folder.',
            'Forge not found',
          );
        }

        if (forgeAvailable) {
          const forgeSpinner = p.spinner();
          forgeSpinner.start('Installing forge dependencies...');
          try {
            await execa('forge', ['install', 'foundry-rs/forge-std', '--no-git'], { cwd: contractDir });
            forgeSpinner.stop('Forge deps installed.');
          } catch {
            forgeSpinner.stop('forge-std already installed or network issue — continuing.');
          }

          const buildSpinner = p.spinner();
          buildSpinner.start('Compiling smart contracts...');
          try {
            await execa('forge', ['build'], { cwd: contractDir });
            buildSpinner.stop('Contracts compiled.');
          } catch (err) {
            buildSpinner.stop('Build failed — run `forge build` manually in contracts/.');
          }
        }
      }

      // ── Inject contract artifact into frontend ───────────────
      if (projectType === 'fullstack') {
        const frontendLib = path.join(targetDir, 'frontend', 'src', 'lib');
        await fs.ensureDir(frontendLib);

        const forgeOutPath = path.join(contractDir, 'out', `${starterConfig.contractFile}.sol`, `${starterConfig.contractName}.json`);
        const hardhatOutPath1 = path.join(contractDir, 'artifacts', 'contracts', `${starterConfig.contractFile}.sol`, `${starterConfig.contractName}.json`);
        const hardhatOutPath2 = path.join(contractDir, 'artifacts', 'src', `${starterConfig.contractFile}.sol`, `${starterConfig.contractName}.json`);

        let contractArtifact: {
          contractName: string;
          deployScriptName: string;
          abi: any[];
          bytecode: string;
        };

        const resolvedHardhatPath = (await fs.pathExists(hardhatOutPath1)) ? hardhatOutPath1 : (await fs.pathExists(hardhatOutPath2)) ? hardhatOutPath2 : null;

        if (resolvedHardhatPath) {
          const artifact = await fs.readJson(resolvedHardhatPath);
          const rawBytecode = typeof artifact.bytecode === 'string' ? artifact.bytecode : artifact.bytecode?.object || artifact.bytecode?.bytecode || '';
          contractArtifact = {
            contractName: starterConfig.contractName,
            deployScriptName: starterConfig.deployScriptName,
            abi: artifact.abi ?? [],
            bytecode: rawBytecode,
          };
        } else if (await fs.pathExists(forgeOutPath)) {
          const artifact = await fs.readJson(forgeOutPath);
          contractArtifact = {
            contractName: starterConfig.contractName,
            deployScriptName: starterConfig.deployScriptName,
            abi: artifact.abi ?? [],
            bytecode: artifact.bytecode?.object ?? artifact.bytecode ?? '',
          };
        } else {
          const KNOWN_CONTRACTS: Record<string, { abi: any[]; bytecode: string }> = {
            counter: {
              abi: [
                { type: 'function', name: 'number', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
                { type: 'function', name: 'increment', inputs: [], outputs: [], stateMutability: 'nonpayable' },
                { type: 'function', name: 'setNumber', inputs: [{ name: 'newNumber', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
              ],
              bytecode: '0x608060405234801561001057600080fd5b506101f2806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80633fb5c1cb146100465780638381f58a14610062578063d09de08a14610080575b600080fd5b610060600480360381019061005b91906100ee565b61008a565b005b61006a610094565b604051610077919061012a565b60405180910390f35b61008861009a565b005b8060008190555050565b60005481565b6000808154809291906100ac90610174565b9190505550565b600080fd5b6000819050919050565b6100cb816100b8565b81146100d657600080fd5b50565b6000813590506100e8816100c2565b92915050565b600060208284031215610104576101036100b3565b5b6000610112848285016100d9565b91505092915050565b610124816100b8565b82525050565b600060208201905061013f600083018461011b565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600061017f826100b8565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036101b1576101b0610145565b5b600182019050919050565b600080fd5b6000819050919050565b61025a81610247565b811461026557600080fd5b50565b60008135905061027781610251565b92915050565b60006020828403121561029357610292610242565b5b60006102a184828501610268565b91505092915050565b60008115159050919050565b6102bf816102aa565b82525050565b60006020820190506102da60008301846102b6565b92915050565b600082825260208201905092915050565b7f43757272656e742070757a7a6c65206e6f7420736f6c76656420796574000000600082015250565b6000610327601d836102e0565b9150610332826102f1565b602082019050919050565b600060208201905081810360008301526103568161031a565b9050919050565b61036681610247565b82525050565b6000602082019050610381600083018461035d565b92915050565b7f416c726561647920736f6c766564000000000000000000000000000000000000600082015250565b60006103bd600e836102e0565b91506103c882610387565b602082019050919050565b600060208201905081810360008301526103ec816103b0565b9050919050565b6000604082019050610408600083018561035d565b61041560208301846102b6565b939250505056fea26469706673582212209282b910e98c5e42a6ce44c7fcf99cc9e6cd6263075f79ce3b565bada8858b2f64736f6c63430008140033',
            },
            'guess-the-number': {
              abi: [
                { type: 'constructor', inputs: [{ name: '_secretNumber', type: 'uint256' }], stateMutability: 'nonpayable' },
                { type: 'event', name: 'Guess', inputs: [{ name: 'player', type: 'address', indexed: true }, { name: 'guess', type: 'uint256', indexed: false }, { name: 'correct', type: 'bool', indexed: false }] },
                { type: 'event', name: 'NewSecretNumber', inputs: [{ name: 'secretNumber', type: 'uint256', indexed: false }] },
                { type: 'function', name: 'guess', inputs: [{ name: '_guess', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
                { type: 'function', name: 'setSecretNumber', inputs: [{ name: '_newSecretNumber', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
                { type: 'function', name: 'solved', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
              ],
              bytecode: '0x608060405234801561001057600080fd5b50604051610584380380610584833981810160405281019061003291906100cc565b806000819055506000600160006101000a81548160ff0219169083151502179055507f506e2d61c571315880bfdd16374eb16b9f6dcba0170f8a586109148dbcb0390e816040516100839190610108565b60405180910390a150610123565b600080fd5b6000819055506000600160006101000a81548160ff0219169083151502179055507f506e2d61c571315880bfdd16374eb16b9f6dcba0170f8a586109148dbcb0390e81604051610150919061036c565b60405180910390a150565b600160009054906101000a900460ff1681565b6000600160009054906101000a900460ff16156101c0576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101b7906103d3565b60405180910390fd5b600080548314905080156101e95760018060006101000a81548160ff0219169083151502179055505b3373ffffffffffffffffffffffffffffffffffffffff167f1fbb72c218fb4b58c4553c2ad6a91e9a851396fab4d8b037044737a3a6e2511484836040516102319291906103f3565b60405180910390a280915050919050565b600080fd5b6000819050919050565b61025a81610247565b811461026557600080fd5b50565b60008135905061027781610251565b92915050565b60006020828403121561029357610292610242565b5b60006102a184828501610268565b91505092915050565b60008115159050919050565b6102bf816102aa565b82525050565b60006020820190506102da60008301846102b6565b92915050565b600082825260208201905092915050565b7f43757272656e742070757a7a6c65206e6f7420736f6c76656420796574000000600082015250565b6000610327601d836102e0565b9150610332826102f1565b602082019050919050565b600060208201905081810360008301526103568161031a565b9050919050565b61036681610247565b82525050565b6000602082019050610381600083018461035d565b92915050565b7f416c726561647920736f6c766564000000000000000000000000000000000000600082015250565b60006103bd600e836102e0565b91506103c882610387565b602082019050919050565b600060208201905081810360008301526103ec816103b0565b9050919050565b6000604082019050610408600083018561035d565b61041560208301846102b6565b939250505056fea26469706673582212209282b910e98c5e42a6ce44c7fcf99cc9e6cd6263075f79ce3b565bada8858b2f64736f6c63430008140033',
            },
          };
          const fallback = KNOWN_CONTRACTS[contractStarter] ?? KNOWN_CONTRACTS.counter;
          contractArtifact = {
            contractName: starterConfig.contractName,
            deployScriptName: starterConfig.deployScriptName,
            abi: fallback.abi,
            bytecode: fallback.bytecode,
          };
        }

        await fs.writeJson(path.join(frontendLib, 'contract.json'), contractArtifact, { spaces: 2 });
      }

      printSuccessBanner(`Project ${projectName} created successfully!`);
      p.outro(chalk.green(`Next steps to start building:`));
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  cd ${projectName}`);
      if (projectType === 'fullstack') {
        console.log('  cd frontend');
        console.log('  cp .env.example .env');
        console.log(`  ${getDevCommandString(packageManager as PackageManager)}`);
        console.log();
        console.log(chalk.gray('The UI has a built-in contract deployer & interactor!'));
      } else {
        if (contractFramework === 'hardhat') {
          console.log('  npx hardhat compile');
          console.log(`  npx hardhat run scripts/deploy.ts --network ${selectedNetwork.name.toLowerCase().includes('mainnet') ? 'mainnet' : 'testnet'}`);
        } else {
          console.log('  forge test');
          console.log(`  forge script script/${starterConfig.deployScriptName}.s.sol --rpc-url ${selectedNetwork.rpcUrl} --broadcast`);
        }
      }
      console.log();
    } catch (error) {
      s.stop('Scaffolding failed.');
      p.cancel(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function generateRootReadme(
  projectName: string,
  frontend?: string,
  devCommand?: string,
  deployScriptName?: string,
): string {
  return `# ${projectName}

A **BOT Chain** fullstack project generated by \`bot-cli\`.

## Structure

\`\`\`
${projectName}/
├── contracts/        # Foundry smart-contract project (Solidity)
│   ├── src/          # Contract source files
│   ├── test/         # Forge tests
│   ├── script/       # Deployment scripts
│   └── lib/          # Dependencies (forge-std)
├── frontend/         # ${frontend ?? 'Vite'} frontend
│   ├── src/
│   │   ├── components/ContractPlayground.vue/tsx
│   │   ├── botChain.ts
│   │   └── lib/contract.json  # Compiled ABI + bytecode (auto-generated)
│   └── package.json
└── README.md
\`\`\`

## Prerequisites

- **Node.js** >= 18
- **Foundry** (for compiling & deploying contracts):
  \`\`\`bash
  curl -L https://foundry.paradigm.xyz | bash && foundryup
  \`\`\`

## Quick Start

### 1. Frontend

\`\`\`bash
cd ${projectName}/frontend
cp .env.example .env
# Edit .env — set your target chain ID and RPC URL
${devCommand ?? 'npm run dev'}
\`\`\`

### 2. Deploy Contracts (two ways)

**Option A — From the UI (easiest):**
1. Open the app in your browser (from step 1 above)
2. Connect your wallet
3. Click **Deploy Contract** — signs a deployment transaction via your wallet
4. Once deployed, read/write contract functions directly from the UI

**Option B — From the terminal:**
\`\`\`bash
cd ${projectName}/contracts
forge install          # one-time: install forge-std
forge build            # compile
source .env
forge script script/${deployScriptName ?? 'DeployCounter'}.s.sol \\
  --rpc-url https://rpc.bohr.life \\
  --broadcast \\
  --private-key $PRIVATE_KEY
\`\`\`

Or use the interactive \`botdev deploy\` command:
\`\`\`bash
botdev deploy --script ${deployScriptName ?? 'DeployCounter'} --rpc https://rpc.bohr.life
\`\`\`

## Network Details

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| BOT Mainnet | 677 | \`https://rpc.botchain.ai\` | https://scan.botchain.ai |
| BOT Testnet | 968 | \`https://rpc.bohr.life\` | https://scan.bohr.life |

## Learn More

- [BOT Chain Documentation](https://docs.botchain.ai)
- [Foundry Book](https://book.getfoundry.sh)
- [wagmi](https://wagmi.sh)
`;
}

// ── bot init list ─────────────────────────────────────────────────────────────
initCommand
  .command('list')
  .description('List all available templates and frameworks')
  .action(() => {
    console.log();
    console.log(chalk.bold.cyanBright('  📦  Available Templates'));
    console.log();
    console.log(chalk.dim('  Contract Frameworks:'));
    console.log(`    ${chalk.cyan('foundry')}           Foundry (forge) — fast, Rust-based`);
    console.log(`    ${chalk.cyan('hardhat')}           Hardhat — JS/TS, extensive plugin ecosystem`);
    console.log();
    console.log(chalk.dim('  Contract Starters:'));
    console.log(`    ${chalk.cyan('counter')}           Simple counter contract (read/write state)`);
    console.log(`    ${chalk.cyan('guess-the-number')}  Number guessing game contract`);
    console.log();
    console.log(chalk.dim('  Frontend Templates (Fullstack dApp only):'));
    console.log(`    ${chalk.cyan('nextjs-react')}      Next.js 14 + React + RainbowKit + Wagmi`);
    console.log(`    ${chalk.cyan('vite-react')}        Vite + React + RainbowKit + Wagmi`);
    console.log(`    ${chalk.cyan('vite-vue')}          Vite + Vue 3`);
    console.log(`    ${chalk.cyan('vite-vanilla')}      Vite + Vanilla JS`);
    console.log();
    console.log(chalk.dim('  Package Managers:'));
    console.log(`    ${chalk.cyan('bun')}  ${chalk.cyan('npm')}  ${chalk.cyan('yarn')}  ${chalk.cyan('pnpm')}`);
    console.log();
    console.log(`  Run ${chalk.cyan('bot init')} to start interactive scaffolding.`);
    console.log();
  });
