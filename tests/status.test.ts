import { StatusHandler } from '../src/status';

test('Status', () => {
    StatusHandler.Get.add(
        'warning',
        'This is a warning',
    );
    expect(StatusHandler.Get.getStatusMessages('warning').length).toBe(1);
    StatusHandler.Get.clear();
    expect(StatusHandler.Get.getStatusMessages('warning').length).toBe(0);
});

test('Status', () => {
    StatusHandler.Get.add(
        'warning',
        'This is a warning',
    );
    StatusHandler.Get.add(
        'info',
        'This is some info',
    );
    StatusHandler.Get.add(
        'info',
        'This is some more info',
    );
    expect(StatusHandler.Get.getStatusMessages( 'info').length).toBe(2);
    expect(StatusHandler.Get.getStatusMessages( 'warning').length).toBe(1);
    StatusHandler.Get.clear();
    expect(StatusHandler.Get.getStatusMessages( 'info').length).toBe(0);
    expect(StatusHandler.Get.getStatusMessages( 'warning').length).toBe(0);
});
