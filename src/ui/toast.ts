export enum ToastStyle {
    Success = "bg-success",
    Failure = "bg-failure"
}

export class Toast {

    private static current: ToastStyle = ToastStyle.Success;
    private static autoHideDelay: number = 4000;

    public static show(text: string, style: ToastStyle) {
        this._setText(text);
        this._setStyle(style);
        this._show();
        setTimeout(() => { this._hide(); }, this.autoHideDelay);
    }

    private static _setText(text: string) {
        $("#toast").html(text);
    }

    private static _setStyle(style: ToastStyle) {
        $("#toast").removeClass(Toast.current);
        $("#toast").addClass(style);
        Toast.current = style;
    }

    private static _show() {
        $("#toast").removeClass("hide");
    }

    private static _hide() {
        $("#toast").addClass("hide");
    }

}