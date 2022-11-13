import chalk from 'chalk';

export type TLogStyle = 'None' | 'Option' | 'Prompt' | 'Info' | 'Warning' | 'Failure' | 'Success';

export function log(style: TLogStyle, message: string) {
    switch (style) {
        case 'None': {
            /* eslint-disable-next-line no-console */
            console.log(`     ${chalk.whiteBright(message)}`);
            break;
        }
        case 'Prompt': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.blue.inverse('INFO')} ${chalk.blue(message)}`);
            break;
        }
        case 'Option': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.magenta(message)}`);
            break;
        }
        case 'Info': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.white(message)}`);
            break;
        }
        case 'Warning': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.yellow.inverse('WARN')} ${chalk.yellow(message)}`);
            break;
        }
        case 'Failure': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.red.inverse('UHOH')} ${chalk.red(message)}`);
            break;
        }
        case 'Success': {
            /* eslint-disable-next-line no-console */
            console.log(`${chalk.green.inverse(' OK ')} ${chalk.green(message)}`);
            break;
        }
    }
}

/**
 * Conditionally log to the console
 * @param condition The condition to evaluate
 * @param trueMessage The message to print if the condition is true
 * @param falseMessage The message to print if the condition is false
 * @param exitOnFalse Should the process exit if the condition is false
 */
export function clog(condition: boolean, trueMessage: string, falseMessage: string, exitOnFalse: boolean = true) {
    if (condition) {
        log('Success', trueMessage);
    } else {
        log('Failure', falseMessage);
        if (exitOnFalse) {
            process.exit(1);
        }
    }
}
