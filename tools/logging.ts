import chalk from "chalk";

export enum LogStyle {
    None = "None",
    Info = "Info",
    Warning = "Warning",
    Failure = "Failure",
    Success = "Success"
}

const LogStyleDetails: {[style: string]: {style: chalk.Chalk, prefix: string}} = {};
LogStyleDetails[LogStyle.Info] = {style: chalk.white, prefix: chalk.white.inverse("INFO")};
LogStyleDetails[LogStyle.Warning] = {style: chalk.yellow, prefix: chalk.yellow.inverse("WARN")};
LogStyleDetails[LogStyle.Failure] = {style: chalk.red, prefix: chalk.red.inverse("UHOH")};
LogStyleDetails[LogStyle.Success] = {style: chalk.green, prefix: chalk.green.inverse(" OK ")};

export function log(style: LogStyle, message: string) {
    if (style === LogStyle.None) {
        console.log(chalk.whiteBright(message));
    } else {
        const details: {style: chalk.Chalk, prefix: string} = LogStyleDetails[style];
        console.log(details.prefix + " " + details.style(message));
    }
}