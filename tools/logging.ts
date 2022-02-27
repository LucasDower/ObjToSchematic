import chalk from 'chalk';

/* eslint-disable */
export enum LogStyle {
    None = 'None',
    Info = 'Info',
    Warning = 'Warning',
    Failure = 'Failure',
    Success = 'Success'
}
/* eslint-enable */

const LogStyleDetails: {[style: string]: {style: chalk.Chalk, prefix: string}} = {};
LogStyleDetails[LogStyle.Info] = {style: chalk.blue, prefix: chalk.blue.inverse('INFO')};
LogStyleDetails[LogStyle.Warning] = {style: chalk.yellow, prefix: chalk.yellow.inverse('WARN')};
LogStyleDetails[LogStyle.Failure] = {style: chalk.red, prefix: chalk.red.inverse('UHOH')};
LogStyleDetails[LogStyle.Success] = {style: chalk.green, prefix: chalk.green.inverse(' OK ')};

export function log(style: LogStyle, message: string) {
    if (style === LogStyle.None) {
        /* eslint-disable */
        console.log(chalk.whiteBright(message));
        /* eslint-enable */
    } else {
        const details: {style: chalk.Chalk, prefix: string} = LogStyleDetails[style];
        /* eslint-disable */
        console.log(details.prefix + ' ' + details.style(message));
        /* eslint-enable */
    }
}

export function logBreak() {
    /* eslint-disable */
    console.log()
    /* eslint-enable */
}
