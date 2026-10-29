from __future__ import annotations

from tools.bootstrap_check import command_check, configured, version_tuple


def test_versions_from_actual_tool_output() -> None:
    assert version_tuple("v24.7.0") == (24, 7, 0)
    assert version_tuple('openjdk version "21.0.8"') == (21, 0, 8)
    assert version_tuple("git version 2.51.0") == (2, 51, 0)
    assert version_tuple("Java runtime not found") == ()


def test_placeholder_values_do_not_pass_configuration_gate() -> None:
    assert not configured(None)
    assert not configured("")
    assert not configured("https://<project-ref>.supabase.co")
    assert not configured("+91XXXXXXXXXX")
    assert configured("https://local-test.supabase.co")


def test_missing_optional_java_is_not_a_required_failure(monkeypatch) -> None:
    monkeypatch.setattr("tools.bootstrap_check.shutil.which", lambda _: None)
    check = command_check("Java", ["java", "-version"], (21, 0), "Install Java", required=False)
    assert not check.ok
    assert not check.required


def test_old_node_fails_even_if_command_succeeds(monkeypatch) -> None:
    from subprocess import CompletedProcess

    monkeypatch.setattr("tools.bootstrap_check.shutil.which", lambda _: "/bin/node")
    monkeypatch.setattr("tools.bootstrap_check.subprocess.run", lambda *args, **kwargs: CompletedProcess(args, 0, "v20.19.0", ""))
    assert not command_check("Node", ["node", "--version"], (22, 12), "Upgrade Node").ok
