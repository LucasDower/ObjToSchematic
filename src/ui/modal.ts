export class Modal {

    public static show(text: string) {
        this._setText(text);
        this._show();
    }

    public static setButton(text: string, onClick: (() => void)) {
        $("#buttonModalAction").html(text);
        $("#buttonModalAction").on("click", () => { this._hide(); onClick(); } );
        $("#buttonModalClose").on("click", () => { this._hide(); });
    }

    private static _setText(text: string) {
        $("#textModal").html(text);
    }

    private static _show() {
        $("#modal").show()
    }

    private static _hide() {
        $("#modal").hide();
    }

}