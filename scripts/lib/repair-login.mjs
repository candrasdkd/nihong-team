import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

export async function promptRepairLogin({ input = process.stdin, output = process.stdout, email = '' } = {}) {
  if (!input.isTTY) throw new Error('Jalankan dari terminal interaktif untuk mengisi login aplikasi Nihong. Jangan kirim password ke chat.');
  let hidden = false;
  const terminalOutput = new Writable({
    write(chunk, encoding, done) {
      if (!hidden) output.write(chunk, encoding);
      done();
    },
  });
  const terminal = createInterface({ input, output: terminalOutput, terminal: true });
  terminal.on('SIGINT', () => terminal.close());
  try {
    const loginEmail = email || (await terminal.question('Email login aplikasi Nihong: ')).trim();
    output.write('Password (tidak ditampilkan): ');
    hidden = true;
    const password = await terminal.question('');
    if (!loginEmail || !password) throw new Error('Email dan password wajib diisi.');
    return { email: loginEmail, password };
  } finally {
    terminal.close();
    output.write('\n');
  }
}
