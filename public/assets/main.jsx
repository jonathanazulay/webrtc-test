/** @jsx React.DOM */
(function (window, undefined) {
    function init () {
        socket = io.connect(this.location.protocol + '//' + this.location.host);
        $('header button').click();
    }
    $(document).ready(function () {
        init();
        React.renderComponent(
            window.App.AppComponent({socket: socket}),
            $('body')[0]
        );
    });
})(this);