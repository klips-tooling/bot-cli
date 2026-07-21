import execa from 'execa';

export type PackageManager = 'npm' | 'yarn' | 'bun';

export const PACKAGE_MANAGERS: PackageManager[] = ['npm', 'yarn', 'bun'];

export function getInstallCommand(pm: PackageManager): string[] {
  switch (pm) {
    case 'npm':
      return ['npm', 'install'];
    case 'yarn':
      return ['yarn', 'install'];
    case 'bun':
      return ['bun', 'install'];
  }
}

export function getInstallCommandString(pm: PackageManager): string {
  return `${pm} install`;
}

export function getDevCommandString(pm: PackageManager): string {
  return `${pm} run dev`;
}

export function getAddCommand(pm: PackageManager, deps: string[], dev = false): string[] {
  switch (pm) {
    case 'npm':
      return dev ? ['npm', 'install', '-D', ...deps] : ['npm', 'install', ...deps];
    case 'yarn':
      return dev ? ['yarn', 'add', '-D', ...deps] : ['yarn', 'add', ...deps];
    case 'bun':
      return dev ? ['bun', 'add', '-d', ...deps] : ['bun', 'add', ...deps];
  }
}

export async function runPackageManager(
  pm: PackageManager,
  args: string[],
  cwd: string,
): Promise<void> {
  const [cmd, ...rest] = args;
  await execa(cmd, rest, { cwd, stdio: 'inherit' });
}

export function packageManagerLabel(pm: PackageManager): string {
  switch (pm) {
    case 'npm':
      return 'npm';
    case 'yarn':
      return 'Yarn';
    case 'bun':
      return 'Bun (fastest)';
  }
}
