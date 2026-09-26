<?php

it('refuses to build a dataset in production', function () {
    $this->app->detectEnvironment(fn () => 'production');

    $this->artisan('data:seed', ['kind' => 'demo'])->assertFailed();
    $this->artisan('data:seed', ['kind' => 'loadtest'])->assertFailed();
});

it('rejects a kind it does not know, before touching any file', function () {
    $this->artisan('data:seed', ['kind' => 'everything'])->assertFailed();
});
